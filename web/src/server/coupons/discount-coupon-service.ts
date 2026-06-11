import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const couponCodeSchema = z
  .string()
  .trim()
  .min(3, "Informe um cupom valido")
  .max(40)
  .transform((value) => normalizeCouponCode(value))
  .refine((value) => value.length >= 3, "Informe um cupom valido");

export const validateCartCouponSchema = z.object({
  code: couponCodeSchema,
  items: z.array(z.object({
    quantity: z.number().int().positive(),
    variantId: z.string().uuid(),
  })).min(1, "Informe ao menos um item"),
});

export const createDiscountCouponSchema = z.object({
  code: couponCodeSchema,
  description: z.string().trim().max(500).optional().nullable(),
  discountType: z.enum(["fixed", "percent"]),
  value: z.number().positive(),
  maxDiscount: z.number().positive().optional().nullable(),
  minOrderTotal: z.number().nonnegative().default(0),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateDiscountCouponSchema = createDiscountCouponSchema.partial();

export type CreateDiscountCouponInput = z.infer<typeof createDiscountCouponSchema>;
export type UpdateDiscountCouponInput = z.infer<typeof updateDiscountCouponSchema>;
export type ValidateCartCouponInput = z.infer<typeof validateCartCouponSchema>;

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "fixed" | "percent";
  value: number | string;
  max_discount: number | string | null;
  min_order_total: number | string;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeCouponCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replaceAll(" ", "")
    .replace(/[^A-Z0-9_-]/g, "");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function mapCouponInput(input: Partial<CreateDiscountCouponInput>, actorId?: string) {
  return {
    code: input.code,
    created_by: actorId,
    description: input.description,
    discount_type: input.discountType,
    expires_at: input.expiresAt,
    is_active: input.isActive,
    max_discount: input.maxDiscount,
    min_order_total: input.minOrderTotal,
    starts_at: input.startsAt,
    usage_limit: input.usageLimit,
    value: input.value,
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

export class DiscountCouponService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {}

  async listCoupons() {
    const { data, error } = await this.supabase
      .from("discount_coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar cupons");
    }

    return data ?? [];
  }

  async createCoupon(input: CreateDiscountCouponInput) {
    this.validateDates(input.startsAt, input.expiresAt);

    if (input.discountType === "percent" && input.value > 100) {
      throw badRequest("Cupom percentual nao pode ser maior que 100%");
    }

    const { data, error } = await this.supabase
      .from("discount_coupons")
      .insert(mapCouponInput(input, this.actorId))
      .select("*")
      .single();

    if (error?.code === "23505") {
      throw conflict("Ja existe um cupom com este codigo");
    }

    if (error) {
      throwQueryError(error, "Falha ao criar cupom");
    }

    return data;
  }

  async updateCoupon(id: string, input: UpdateDiscountCouponInput) {
    this.validateDates(input.startsAt, input.expiresAt);

    if (input.discountType === "percent" && input.value !== undefined && input.value > 100) {
      throw badRequest("Cupom percentual nao pode ser maior que 100%");
    }

    const patch = stripUndefined(mapCouponInput(input, undefined));
    delete patch.created_by;

    const { data, error } = await this.supabase
      .from("discount_coupons")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error?.code === "23505") {
      throw conflict("Ja existe um cupom com este codigo");
    }

    if (error) {
      throwQueryError(error, "Falha ao atualizar cupom");
    }

    return data;
  }

  async validateCartCoupon(input: ValidateCartCouponInput) {
    const subtotal = await this.calculateCartSubtotal(input.items);
    return this.validateCoupon(input.code, subtotal);
  }

  async validateCoupon(code: string, subtotal: number) {
    const normalizedCode = normalizeCouponCode(code);

    if (!normalizedCode) {
      throw badRequest("Informe um cupom valido");
    }

    const { data, error } = await this.supabase
      .from("discount_coupons")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao validar cupom");
    }

    if (!data) {
      throw notFound("Cupom nao encontrado");
    }

    const coupon = data as CouponRow;
    this.assertCouponUsable(coupon, subtotal);
    const discount = this.calculateDiscount(coupon, subtotal);

    return {
      code: coupon.code,
      couponId: coupon.id,
      discount,
      discountType: coupon.discount_type,
      totalAfterDiscount: roundMoney(Math.max(0, subtotal - discount)),
      value: Number(coupon.value),
    };
  }

  async incrementUsage(couponId: string) {
    const { data: coupon, error: couponError } = await this.supabase
      .from("discount_coupons")
      .select("id,usage_limit,used_count")
      .eq("id", couponId)
      .maybeSingle();

    if (couponError) {
      throwQueryError(couponError, "Falha ao validar limite de uso do cupom");
    }

    if (!coupon) {
      throw notFound("Cupom nao encontrado");
    }

    if (coupon.usage_limit !== null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
      throw conflict("Limite de uso do cupom atingido");
    }

    const { error } = await this.supabase
      .from("discount_coupons")
      .update({ used_count: Number(coupon.used_count) + 1 })
      .eq("id", couponId);

    if (error) {
      throwQueryError(error, "Falha ao registrar uso do cupom");
    }
  }

  private async calculateCartSubtotal(items: ValidateCartCouponInput["items"]) {
    const variantIds = Array.from(new Set(items.map((item) => item.variantId)));
    const { data, error } = await this.supabase
      .from("product_variants")
      .select("id,sale_price,status")
      .in("id", variantIds);

    if (error) {
      throwQueryError(error, "Falha ao validar produtos do carrinho");
    }

    const variantById = new Map((data ?? []).map((variant) => [variant.id, variant]));

    return roundMoney(items.reduce((sum, item) => {
      const variant = variantById.get(item.variantId);

      if (!variant) {
        throw badRequest("Produto do carrinho nao encontrado");
      }

      if (variant.status === "hidden" || variant.status === "sold_out") {
        throw conflict("Produto indisponivel no carrinho");
      }

      return sum + Number(variant.sale_price) * item.quantity;
    }, 0));
  }

  private assertCouponUsable(coupon: CouponRow, subtotal: number) {
    const now = Date.now();

    if (!coupon.is_active) {
      throw conflict("Cupom inativo");
    }

    if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
      throw conflict("Cupom ainda nao esta ativo");
    }

    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
      throw conflict("Cupom expirado");
    }

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      throw conflict("Limite de uso do cupom atingido");
    }

    if (subtotal < Number(coupon.min_order_total)) {
      throw conflict(`Pedido minimo para este cupom: R$ ${Number(coupon.min_order_total).toFixed(2)}`);
    }
  }

  private calculateDiscount(coupon: CouponRow, subtotal: number) {
    const rawDiscount =
      coupon.discount_type === "fixed"
        ? Number(coupon.value)
        : subtotal * (Number(coupon.value) / 100);
    const cappedDiscount =
      coupon.max_discount === null
        ? rawDiscount
        : Math.min(rawDiscount, Number(coupon.max_discount));

    return roundMoney(Math.min(subtotal, cappedDiscount));
  }

  private validateDates(startsAt?: string | null, expiresAt?: string | null) {
    if (startsAt && expiresAt && new Date(startsAt).getTime() >= new Date(expiresAt).getTime()) {
      throw badRequest("Data de inicio deve ser anterior a expiracao");
    }
  }
}
