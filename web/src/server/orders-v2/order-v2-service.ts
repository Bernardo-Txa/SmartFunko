import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { couponCodeSchema, DiscountCouponService } from "@/server/coupons/discount-coupon-service";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import {
  checkInfinitePayPaymentStatus,
  createInfinitePayCheckout,
  normalizeInfinitePayWebhook,
  type NormalizedInfinitePayWebhook,
} from "@/server/payments/infinitepay-client";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");

export const v2ApprovalStatusSchema = z.enum(["aguardando_aprovacao", "aprovado", "recusado"]);
export const v2PaymentStatusSchema = z.enum([
  "nao_pago",
  "checkout_gerado",
  "pago",
  "reembolso_pendente",
  "reembolsado",
  "cancelado",
]);
export const v2FulfillmentStatusSchema = z.enum([
  "aguardando_fechamento",
  "solicitado",
  "recebido",
  "enviado",
  "cancelado",
]);

export const createV2OrderCompetenceSchema = z.object({
  code: z.string().trim().regex(/^\d{4}-\d{2}$/, "Codigo deve seguir YYYY-MM"),
  endsOn: isoDateSchema,
  label: z.string().trim().min(3),
  notes: z.string().trim().optional().nullable(),
  startsOn: isoDateSchema,
  status: z.enum(["open", "closed", "archived"]).default("open"),
});

export const createV2OrderItemSchema = z.object({
  productName: z.string().trim().min(2).optional(),
  productSku: z.string().trim().optional().nullable(),
  productVariantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().positive().default(1),
  unitPrice: z.coerce.number().nonnegative().optional(),
});

export const createV2AdminOrderBatchSchema = z.object({
  customerId: z.string().uuid(),
  internalNotes: z.string().trim().optional().nullable(),
  items: z.array(createV2OrderItemSchema).min(1).max(50),
  notes: z.string().trim().optional().nullable(),
  orderDate: isoDateSchema.optional(),
  seller: z.enum(["daniel", "allana"]).optional().nullable(),
});

export const createV2SiteOrderSchema = z.object({
  couponCode: z.string().trim().optional().nullable(),
  couponId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid(),
  discount: z.coerce.number().nonnegative().default(0),
  items: z.array(createV2OrderItemSchema).min(1).max(50),
  notes: z.string().trim().optional().nullable(),
  orderDate: isoDateSchema.optional(),
});

export const createCustomerV2OrderRequestSchema = z.object({
  couponCode: couponCodeSchema.optional().nullable(),
  items: z.array(z.object({
    quantity: z.number().int().positive(),
    variantId: z.string().uuid(),
  })).min(1, "Informe ao menos um item"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const rejectV2OrderSchema = z.object({
  reason: z.string().trim().min(3),
});

export const updateV2FulfillmentSchema = z.object({
  notes: z.string().trim().optional().nullable(),
  status: v2FulfillmentStatusSchema,
  trackingCode: z.string().trim().optional().nullable(),
  trackingUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
});

export const cancelV2OrderSchema = z.object({
  reason: z.string().trim().min(3),
});

export const markV2OrderRefundedSchema = z.object({
  notes: z.string().trim().optional().nullable(),
});

export const createV2PaymentSessionSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(50),
});

export const bulkV2OrderActionSchema = z.object({
  action: z.enum(["approve", "mark_requested", "mark_received"]),
  notes: z.string().trim().optional().nullable(),
  orderIds: z.array(z.string().uuid()).min(1).max(100),
});

export type CreateV2AdminOrderBatchInput = z.infer<typeof createV2AdminOrderBatchSchema>;
export type CreateV2OrderCompetenceInput = z.infer<typeof createV2OrderCompetenceSchema>;
export type CreateV2PaymentSessionInput = z.infer<typeof createV2PaymentSessionSchema>;
export type CreateV2SiteOrderInput = z.infer<typeof createV2SiteOrderSchema>;
export type CreateCustomerV2OrderRequestInput = z.infer<typeof createCustomerV2OrderRequestSchema>;
export type BulkV2OrderActionInput = z.infer<typeof bulkV2OrderActionSchema>;
export type UpdateV2FulfillmentInput = z.infer<typeof updateV2FulfillmentSchema>;

export type V2OrderListFilters = {
  area?: string;
  approvalStatus?: string;
  competenceId?: string;
  customerId?: string;
  fulfillmentStatus?: string;
  limit?: number;
  paymentStatus?: string;
  search?: string;
  source?: string;
};

type CustomerRow = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: string;
};

type CompetenceRow = {
  code: string;
  ends_on: string;
  id: string;
  label: string;
  starts_on: string;
  status: string;
};

type V2OrderItemInput = z.infer<typeof createV2OrderItemSchema>;

type EnrichedV2OrderItem = {
  itemContext: "general" | "supplier";
  productId: string | null;
  productName: string;
  productSku: string | null;
  productVariantId: string | null;
  quantity: number;
  supplierId: string | null;
  unitPrice: number;
};

type V2OrderRow = {
  approval_status: string;
  competence_id: string;
  created_at: string;
  customer_id: string;
  customers?: CustomerRow | CustomerRow[] | null;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  payment_status: string;
  seller: string | null;
  source: string;
  total: number | string;
  v2_order_competencies?: CompetenceRow | CompetenceRow[] | null;
  v2_order_items?: Array<{
    item_context?: string | null;
    product_id?: string | null;
    product_name: string;
    product_sku: string | null;
    supplier_id?: string | null;
    quantity: number | string;
    total_price: number | string;
    unit_price: number | string;
  }>;
};

type V2PaymentSessionRow = {
  amount: number | string;
  checkout_number: string;
  customer_id: string;
  id: string;
  invoice_slug: string | null;
  payment_link_url: string | null;
  provider_reference: string | null;
  status: string;
  transaction_nsu: string | null;
};

type VariantCartRow = {
  id: string;
  products?: {
    name?: string | null;
  } | Array<{
    name?: string | null;
  }> | null;
  sale_price: number | string;
  sku: string;
  status: string;
};

type AreaOrderItemRow = {
  order_id: string;
};

const ORDER_ID_FILTER_CHUNK_SIZE = 80;

function orderSelect() {
  return `
    id,order_number,customer_id,competence_id,source,order_date,
    approval_status,payment_status,fulfillment_status,seller,
    subtotal,discount,total,coupon_id,coupon_code,customer_visible,notes,internal_notes,rejection_reason,cancellation_reason,refund_notes,
    tracking_code,tracking_url,requested_at,received_at,shipped_at,paid_at,refund_requested_at,refunded_at,
    created_by,reviewed_by,reviewed_at,created_at,updated_at,
    customers(id,name,email,phone,status),
    v2_order_competencies(id,code,label,starts_on,ends_on,status),
    v2_order_items(id,product_variant_id,product_id,supplier_id,item_context,product_name,product_sku,quantity,unit_price,total_price,created_at,updated_at),
    v2_payment_session_orders(
      amount,
      v2_payment_sessions(id,checkout_number,status,payment_link_url,paid_at,created_at)
    )
  `;
}

function paymentSessionSelect() {
  return `
    id,checkout_number,customer_id,competence_id,provider,status,amount,payment_link_url,
    provider_reference,invoice_slug,transaction_nsu,receipt_url,paid_amount,provider_fee_amount,paid_installments,
    expires_at,paid_at,created_by,created_at,updated_at,
    customers(id,name,email,phone,status),
    v2_order_competencies(id,code,label,starts_on,ends_on,status),
    v2_payment_session_orders(
      amount,
      v2_orders(
        id,order_number,customer_id,competence_id,source,order_date,
        approval_status,payment_status,fulfillment_status,total,
        v2_order_items(id,product_name,product_sku,quantity,unit_price,total_price)
      )
    )
  `;
}

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function nowIso() {
  return new Date().toISOString();
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function createNumber(prefix: "SFV2" | "SFV2PAY") {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${date}-${time}-${suffix}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function centsToCurrency(value: number | null) {
  return value === null ? null : roundMoney(value / 100);
}

function escapeIlike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_").trim();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function sortOrderRows(orders: V2OrderRow[]) {
  return [...orders].sort((left, right) => {
    const dateCompare = right.order_date.localeCompare(left.order_date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.created_at.localeCompare(left.created_at);
  });
}

function normalizeTrackingUrl(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export class OrderV2Service {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {}

  async listCompetencies() {
    const { data, error } = await this.supabase
      .from("v2_order_competencies")
      .select("id,code,label,starts_on,ends_on,status,notes,created_at,updated_at")
      .order("starts_on", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar competencias V2");
    }

    return data ?? [];
  }

  async createCompetence(input: CreateV2OrderCompetenceInput) {
    if (input.startsOn > input.endsOn) {
      throw badRequest("Inicio da competencia deve ser antes do fim");
    }

    const { data, error } = await this.supabase
      .from("v2_order_competencies")
      .insert({
        code: input.code,
        created_by: this.actorId ?? null,
        ends_on: input.endsOn,
        label: input.label,
        notes: input.notes ?? null,
        starts_on: input.startsOn,
        status: input.status,
      })
      .select("id,code,label,starts_on,ends_on,status,notes,created_at,updated_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar competencia V2");
    }

    return data;
  }

  private async getSupplierIdForArea(area: string) {
    if (isUuid(area)) {
      return area;
    }

    const { data, error } = await this.supabase
      .from("suppliers")
      .select("id")
      .eq("slug", area)
      .maybeSingle<{ id: string }>();

    if (error) {
      throwQueryError(error, "Falha ao localizar collab dos pedidos");
    }

    return data?.id ?? null;
  }

  private async getOrderIdsForArea(area: string) {
    const normalizedArea = area.trim();

    if (!normalizedArea || normalizedArea === "all") {
      return undefined;
    }

    let query = this.supabase
      .from("v2_order_items")
      .select("order_id")
      .limit(5000);

    if (normalizedArea === "general") {
      query = query.is("supplier_id", null);
    } else {
      const supplierId = await this.getSupplierIdForArea(normalizedArea);

      if (!supplierId) {
        return [];
      }

      query = query.eq("supplier_id", supplierId);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao filtrar pedidos por area");
    }

    return uniqueValues(((data ?? []) as AreaOrderItemRow[]).map((item) => item.order_id));
  }

  async listAdminOrders(filters: V2OrderListFilters = {}) {
    const limit = Math.min(1000, Math.max(1, Number(filters.limit ?? 500)));
    const search = filters.search?.trim();
    let customerIds: string[] = [];
    const areaOrderIds = filters.area ? await this.getOrderIdsForArea(filters.area) : undefined;

    if (areaOrderIds && areaOrderIds.length === 0) {
      return [];
    }

    if (search) {
      const safeSearch = escapeIlike(search);
      const { data: customers, error: customerError } = await this.supabase
        .from("customers")
        .select("id")
        .or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
        .limit(100);

      if (customerError) {
        throwQueryError(customerError, "Falha ao buscar clientes para filtro V2");
      }

      customerIds = (customers ?? []).map((customer) => customer.id);
    }

    const buildQuery = (orderIds?: string[]) => {
      let query = this.supabase
        .from("v2_orders")
        .select(orderSelect())
        .order("order_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters.approvalStatus) {
        query = query.eq("approval_status", filters.approvalStatus);
      }

      if (filters.competenceId) {
        query = query.eq("competence_id", filters.competenceId);
      }

      if (filters.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }

      if (filters.fulfillmentStatus) {
        query = query.eq("fulfillment_status", filters.fulfillmentStatus);
      }

      if (filters.paymentStatus) {
        query = query.eq("payment_status", filters.paymentStatus);
      }

      if (filters.source) {
        query = query.eq("source", filters.source);
      }

      if (orderIds) {
        query = query.in("id", orderIds);
      }

      if (search) {
        const safeSearch = escapeIlike(search);
        const clauses = [`order_number.ilike.%${safeSearch}%`];

        if (customerIds.length > 0) {
          clauses.push(`customer_id.in.(${customerIds.join(",")})`);
        }

        query = query.or(clauses.join(","));
      }

      return query;
    };

    if (areaOrderIds && areaOrderIds.length > ORDER_ID_FILTER_CHUNK_SIZE) {
      const orders: V2OrderRow[] = [];

      for (const orderIdChunk of chunkValues(areaOrderIds, ORDER_ID_FILTER_CHUNK_SIZE)) {
        const { data, error } = await buildQuery(orderIdChunk);

        if (error) {
          throwQueryError(error, "Falha ao listar pedidos V2");
        }

        orders.push(...((data ?? []) as unknown as V2OrderRow[]));
      }

      return sortOrderRows(orders).slice(0, limit);
    }

    const { data, error } = await buildQuery(areaOrderIds);

    if (error) {
      throwQueryError(error, "Falha ao listar pedidos V2");
    }

    return data ?? [];
  }

  async getAdminOrderById(id: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(orderSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido V2");
    }

    if (!data) {
      throw notFound("Pedido V2 nao encontrado");
    }

    return data;
  }

  async getCustomerOrders(customerId: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(orderSelect())
      .eq("customer_id", customerId)
      .eq("customer_visible", true)
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar pedidos V2 do cliente");
    }

    return data ?? [];
  }

  async createAdminWhatsAppOrders(input: CreateV2AdminOrderBatchInput) {
    const customer = await this.getActiveCustomer(input.customerId);
    const orderDate = input.orderDate ?? todayInSaoPaulo();
    const competence = await this.getCompetenceForDate(orderDate);
    const enrichedItems = await Promise.all(input.items.map((item) => this.enrichItem(item)));
    const orders = [];

    for (const item of enrichedItems) {
      const order = await this.insertOrderWithItems({
        approvalStatus: "aprovado",
        competence,
        customer,
        fulfillmentStatus: "aguardando_fechamento",
        internalNotes: input.internalNotes ?? null,
        items: [item],
        notes: input.notes ?? null,
        orderDate,
        paymentStatus: "nao_pago",
        seller: input.seller ?? null,
        source: "admin_whatsapp",
      });
      orders.push(order);
    }

    return orders;
  }

  async createSiteOrderRequest(input: CreateV2SiteOrderInput, actorProfileId?: string) {
    const customer = await this.getActiveCustomer(input.customerId);
    const orderDate = input.orderDate ?? todayInSaoPaulo();
    const competence = await this.getCompetenceForDate(orderDate);
    const items = await Promise.all(input.items.map((item) => this.enrichItem(item)));

    return this.insertOrderWithItems({
      approvalStatus: "aguardando_aprovacao",
      competence,
      couponCode: input.couponCode ?? null,
      couponId: input.couponId ?? null,
      customer,
      discount: input.discount,
      fulfillmentStatus: "aguardando_fechamento",
      internalNotes: null,
      items,
      notes: input.notes ?? null,
      orderDate,
      paymentStatus: "nao_pago",
      source: "site",
      visibleActorId: actorProfileId,
    });
  }

  async createCustomerSiteOrderFromCart(
    customerId: string,
    input: CreateCustomerV2OrderRequestInput,
    actorProfileId?: string,
  ) {
    const variantIds = uniqueValues(input.items.map((item) => item.variantId));
    const { data: variants, error: variantsError } = await this.supabase
      .from("product_variants")
      .select("id,sku,sale_price,status,products(name)")
      .in("id", variantIds);

    if (variantsError) {
      throwQueryError(variantsError, "Falha ao validar produtos do carrinho V2");
    }

    const variantById = new Map((variants as unknown as VariantCartRow[]).map((variant) => [variant.id, variant]));
    const items = input.items.map((item) => {
      const variant = variantById.get(item.variantId);

      if (!variant) {
        throw badRequest("Produto do carrinho nao encontrado");
      }

      if (variant.status === "hidden" || variant.status === "sold_out") {
        throw conflict(`Produto indisponivel: ${firstRelation(variant.products)?.name ?? variant.sku}`);
      }

      return {
        productName: firstRelation(variant.products)?.name ?? variant.sku,
        productSku: variant.sku,
        productVariantId: variant.id,
        quantity: item.quantity,
        unitPrice: Number(variant.sale_price),
      };
    });
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    const couponService = new DiscountCouponService(this.supabase, actorProfileId ?? this.actorId);
    const coupon = input.couponCode
      ? await couponService.validateCoupon(input.couponCode, subtotal)
      : null;
    const order = await this.createSiteOrderRequest({
      couponCode: coupon?.code ?? null,
      couponId: coupon?.couponId ?? null,
      customerId,
      discount: coupon?.discount ?? 0,
      items,
      notes: input.notes ?? null,
    }, actorProfileId);

    if (coupon) {
      await couponService.incrementUsage(coupon.couponId);
    }

    return order;
  }

  async approveOrder(orderId: string, actorProfileId = this.actorId) {
    const order = await this.getOrderCore(orderId);

    if (order.approval_status === "aprovado") {
      return this.getAdminOrderById(orderId);
    }

    if (order.approval_status === "recusado") {
      throw conflict("Pedido recusado nao pode ser aprovado sem reabrir manualmente");
    }

    const now = nowIso();
    const { error } = await this.supabase
      .from("v2_orders")
      .update({
        approval_status: "aprovado",
        reviewed_at: now,
        reviewed_by: actorProfileId ?? null,
      })
      .eq("id", orderId);

    if (error) {
      throwQueryError(error, "Falha ao aprovar pedido V2");
    }

    await this.addEvent({
      actorId: actorProfileId,
      customerId: order.customer_id,
      eventType: "approval.approved",
      fromStatus: order.approval_status,
      notes: "Pedido aprovado para pagamento",
      orderId,
      toStatus: "aprovado",
    });

    return this.getAdminOrderById(orderId);
  }

  async rejectOrder(orderId: string, reason: string, actorProfileId = this.actorId) {
    const order = await this.getOrderCore(orderId);

    if (order.payment_status === "pago") {
      throw conflict("Pedido pago nao pode ser recusado; cancele e marque reembolso pendente");
    }

    const now = nowIso();
    const { error } = await this.supabase
      .from("v2_orders")
      .update({
        approval_status: "recusado",
        fulfillment_status: "cancelado",
        payment_status: "cancelado",
        rejected_at: now,
        rejection_reason: reason,
        reviewed_at: now,
        reviewed_by: actorProfileId ?? null,
      })
      .eq("id", orderId);

    if (error) {
      throwQueryError(error, "Falha ao recusar pedido V2");
    }

    await this.addEvent({
      actorId: actorProfileId,
      customerId: order.customer_id,
      eventType: "approval.rejected",
      fromStatus: order.approval_status,
      notes: reason,
      orderId,
      toStatus: "recusado",
    });

    return this.getAdminOrderById(orderId);
  }

  async updateFulfillment(orderId: string, input: UpdateV2FulfillmentInput, actorProfileId = this.actorId) {
    const order = await this.getOrderCore(orderId);
    const trackingCode = input.trackingCode?.trim() || order.tracking_code || null;
    const trackingUrl = normalizeTrackingUrl(input.trackingUrl) ?? order.tracking_url ?? null;
    const fulfillmentFlow = ["aguardando_fechamento", "solicitado", "recebido", "enviado"];
    const currentStep = fulfillmentFlow.indexOf(order.fulfillment_status);
    const nextStep = fulfillmentFlow.indexOf(input.status);

    if (input.status === "cancelado") {
      throw conflict("Use a acao de cancelar pedido para preservar pagamento e reembolso");
    }

    if (order.fulfillment_status === "cancelado") {
      throw conflict("Pedido cancelado nao pode avancar na operacao");
    }

    if (order.payment_status !== "pago") {
      throw conflict("Somente pedido pago pode avancar na operacao");
    }

    if (currentStep === -1 || nextStep === -1) {
      throw conflict("Status operacional invalido para este fluxo");
    }

    if (nextStep < currentStep) {
      throw conflict("Pedido nao pode voltar etapa operacional");
    }

    if (nextStep - currentStep > 1) {
      throw conflict("Atualize uma etapa operacional por vez");
    }

    if (input.status === "enviado" && !trackingCode) {
      throw badRequest("Informe o codigo de rastreio para marcar como enviado");
    }

    const now = nowIso();
    const patch: Record<string, unknown> = {
      fulfillment_status: input.status,
      tracking_code: trackingCode,
      tracking_url: trackingUrl,
    };

    if (input.status === "solicitado") {
      patch.requested_at = order.requested_at ?? now;
    }

    if (input.status === "recebido") {
      patch.received_at = order.received_at ?? now;
    }

    if (input.status === "enviado") {
      patch.shipped_at = order.shipped_at ?? now;
    }

    const { error } = await this.supabase.from("v2_orders").update(patch).eq("id", orderId);

    if (error) {
      throwQueryError(error, "Falha ao atualizar operacao do pedido V2");
    }

    if (input.status === "enviado") {
      await this.supabase.from("v2_shipments").insert({
        carrier: null,
        created_by: actorProfileId ?? null,
        customer_id: order.customer_id,
        order_id: orderId,
        shipped_at: now,
        status: "enviado",
        tracking_code: trackingCode,
        tracking_url: trackingUrl,
      });
    }

    await this.addEvent({
      actorId: actorProfileId,
      customerId: order.customer_id,
      eventType: "fulfillment.updated",
      fromStatus: order.fulfillment_status,
      notes: input.notes ?? null,
      orderId,
      toStatus: input.status,
    });

    return this.getAdminOrderById(orderId);
  }

  async applyBulkAction(input: BulkV2OrderActionInput, actorProfileId = this.actorId) {
    const orderIds = uniqueValues(input.orderIds);

    if (input.action === "approve") {
      const orders = await this.getOrderCores(orderIds);

      for (const order of orders) {
        if (order.approval_status !== "aguardando_aprovacao") {
          throw conflict(`Pedido ${order.order_number} nao esta aguardando aprovacao`);
        }
      }

      for (const order of orders) {
        await this.approveOrder(order.id, actorProfileId);
      }

      return {
        action: input.action,
        updated: orders.length,
      };
    }

    const status = input.action === "mark_requested" ? "solicitado" : "recebido";
    const orders = await this.getOrderCores(orderIds);

    for (const order of orders) {
      if (order.payment_status !== "pago") {
        throw conflict(`Pedido ${order.order_number} precisa estar pago`);
      }

      if (order.fulfillment_status === "cancelado") {
        throw conflict(`Pedido ${order.order_number} esta cancelado`);
      }

      if (status === "solicitado" && order.fulfillment_status !== "aguardando_fechamento") {
        throw conflict(`Pedido ${order.order_number} nao esta aguardando fechamento`);
      }

      if (status === "recebido" && order.fulfillment_status !== "solicitado") {
        throw conflict(`Pedido ${order.order_number} precisa estar solicitado`);
      }
    }

    for (const order of orders) {
      await this.updateFulfillment(order.id, {
        notes: input.notes ?? null,
        status,
      }, actorProfileId);
    }

    return {
      action: input.action,
      updated: orders.length,
    };
  }

  async cancelOrder(orderId: string, reason: string, actorProfileId = this.actorId) {
    const order = await this.getOrderCore(orderId);
    const isPaid = order.payment_status === "pago";
    const now = nowIso();
    const patch = isPaid
      ? {
          cancellation_reason: reason,
          fulfillment_status: "cancelado",
          payment_status: "reembolso_pendente",
          refund_requested_at: now,
        }
      : {
          cancellation_reason: reason,
          fulfillment_status: "cancelado",
          payment_status: "cancelado",
        };

    const { error } = await this.supabase.from("v2_orders").update(patch).eq("id", orderId);

    if (error) {
      throwQueryError(error, "Falha ao cancelar pedido V2");
    }

    await this.addEvent({
      actorId: actorProfileId,
      customerId: order.customer_id,
      eventType: isPaid ? "order.cancelled_refund_pending" : "order.cancelled",
      fromStatus: `${order.payment_status}/${order.fulfillment_status}`,
      notes: reason,
      orderId,
      toStatus: isPaid ? "reembolso_pendente/cancelado" : "cancelado/cancelado",
    });

    return this.getAdminOrderById(orderId);
  }

  async markOrderRefunded(orderId: string, notes?: string | null, actorProfileId = this.actorId) {
    const order = await this.getOrderCore(orderId);

    if (!["reembolso_pendente", "pago"].includes(order.payment_status)) {
      throw conflict("Somente pedido pago ou com reembolso pendente pode ser marcado como reembolsado");
    }

    const now = nowIso();
    const { error } = await this.supabase
      .from("v2_orders")
      .update({
        payment_status: "reembolsado",
        refund_notes: notes ?? order.refund_notes ?? null,
        refunded_at: now,
      })
      .eq("id", orderId);

    if (error) {
      throwQueryError(error, "Falha ao marcar reembolso V2");
    }

    await this.addEvent({
      actorId: actorProfileId,
      customerId: order.customer_id,
      eventType: "payment.refunded",
      fromStatus: order.payment_status,
      notes: notes ?? null,
      orderId,
      toStatus: "reembolsado",
    });

    return this.getAdminOrderById(orderId);
  }

  async createCustomerPaymentSession(customerId: string, input: CreateV2PaymentSessionInput, actorProfileId?: string) {
    const orderIds = uniqueValues(input.orderIds);
    const orders = await this.getOrdersForPayment(orderIds);

    if (orders.length !== orderIds.length) {
      throw notFound("Um ou mais pedidos nao foram encontrados");
    }

    for (const order of orders) {
      if (order.customer_id !== customerId) {
        throw notFound("Pedido nao encontrado para este cliente");
      }

      if (order.approval_status !== "aprovado") {
        throw conflict("Pedido ainda nao esta aprovado para pagamento");
      }

      if (["pago", "reembolso_pendente", "reembolsado", "cancelado"].includes(order.payment_status)) {
        throw conflict(`Pedido ${order.order_number} nao esta disponivel para pagamento`);
      }

      if (order.fulfillment_status === "cancelado") {
        throw conflict(`Pedido ${order.order_number} foi cancelado`);
      }

      if (Number(order.total) <= 0) {
        throw conflict(`Pedido ${order.order_number} esta sem valor para pagamento`);
      }
    }

    const competenceIds = uniqueValues(orders.map((order) => order.competence_id));

    if (competenceIds.length !== 1) {
      throw badRequest("Selecione pedidos de uma unica competencia por checkout");
    }

    const customer = firstRelation(orders[0].customers);
    const amount = roundMoney(orders.reduce((sum, order) => sum + Number(order.total), 0));
    const checkoutNumber = createNumber("SFV2PAY");
    const now = nowIso();

    await this.supersedePendingSessionsForOrders(orderIds, customerId);

    const { data: session, error: sessionError } = await this.supabase
      .from("v2_payment_sessions")
      .insert({
        amount,
        checkout_number: checkoutNumber,
        competence_id: competenceIds[0],
        created_by: actorProfileId ?? null,
        customer_id: customerId,
        provider: "infinitepay",
        status: "pending",
      })
      .select("id,checkout_number,customer_id,competence_id,status,amount")
      .single();

    if (sessionError) {
      throwQueryError(sessionError, "Falha ao criar checkout V2");
    }

    try {
      const { error: linkError } = await this.supabase.from("v2_payment_session_orders").insert(
        orders.map((order) => ({
          amount: Number(order.total),
          order_id: order.id,
          payment_session_id: session.id,
        })),
      );

      if (linkError) {
        throwQueryError(linkError, "Falha ao vincular pedidos ao checkout V2");
      }

      const { error: orderStatusError } = await this.supabase
        .from("v2_orders")
        .update({ payment_status: "checkout_gerado" })
        .in("id", orderIds);

      if (orderStatusError) {
        throwQueryError(orderStatusError, "Falha ao atualizar pedidos do checkout V2");
      }

      const checkout = await createInfinitePayCheckout({
        amountCents: Math.round(amount * 100),
        customerEmail: customer?.email ?? null,
        customerName: customer?.name ?? "Cliente Smart Funkos",
        customerPhone: customer?.phone ?? null,
        debugOrderId: session.id,
        items: this.createInfinitePayItems(orders),
        kind: "order_v2",
        orderNumber: checkoutNumber,
        redirectUrl: `${env.siteUrl}/conta/pedidos-v2?checkout=${session.id}`,
        webhookUrl: `${env.siteUrl}/api/v1/webhooks/infinitepay`,
      });

      const { error: updateSessionError } = await this.supabase
        .from("v2_payment_sessions")
        .update({
          payment_link_url: checkout.checkoutUrl,
          provider_reference: checkout.providerReference,
          invoice_slug: checkout.providerReference !== checkoutNumber ? checkout.providerReference : null,
          request_payload: checkout.requestPayload,
          updated_at: now,
        })
        .eq("id", session.id);

      if (updateSessionError) {
        throwQueryError(updateSessionError, "Falha ao salvar link do checkout V2");
      }

      await Promise.all(
        orders.map((order) => this.addEvent({
          actorId: actorProfileId,
          customerId,
          eventType: "payment_session.created",
          fromStatus: order.payment_status,
          metadata: { checkoutNumber, paymentSessionId: session.id },
          notes: "Checkout InfinitePay criado para pagamento parcial",
          orderId: order.id,
          paymentSessionId: session.id,
          toStatus: "checkout_gerado",
        })),
      );

      return this.getPaymentSessionById(session.id);
    } catch (error) {
      await this.supabase.from("v2_payment_sessions").update({ status: "failed" }).eq("id", session.id);
      await this.supabase.from("v2_orders").update({ payment_status: "nao_pago" }).in("id", orderIds);
      throw error;
    }
  }

  async getPaymentSessionById(id: string) {
    const { data, error } = await this.supabase
      .from("v2_payment_sessions")
      .select(paymentSessionSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar checkout V2");
    }

    if (!data) {
      throw notFound("Checkout V2 nao encontrado");
    }

    return data;
  }

  async syncPaymentSession(id: string, actorProfileId?: string | null) {
    const session = await this.getPaymentSessionCore(id);

    if (session.status === "paid") {
      return { paid: true, status: "ignored", reason: "Checkout ja pago" };
    }

    if (!session.payment_link_url) {
      throw conflict("Checkout ainda nao tem link InfinitePay");
    }

    const check = await checkInfinitePayPaymentStatus({
      orderNumber: session.checkout_number,
      slug: session.invoice_slug ?? (session.provider_reference !== session.checkout_number ? session.provider_reference : null),
      transactionNsu: session.transaction_nsu,
    });
    const event = await this.createProviderEvent(check.normalized, check.raw);

    await this.supabase
      .from("v2_payment_provider_events")
      .update({ payment_session_id: session.id })
      .eq("id", event.id);

    if (check.normalized.status === "paid") {
      const result = await this.applyPaidSession(session, check.normalized, event.id, check.raw, actorProfileId);
      return { ...result, paid: true };
    }

    await this.markProviderEvent(event.id, "ignored", "Pagamento ainda nao confirmado");

    return {
      paid: false,
      status: "pending",
    };
  }

  async handleInfinitePayWebhook(payload: unknown) {
    const normalized = normalizeInfinitePayWebhook(payload);

    if (!normalized.eventId || !normalized.providerReference) {
      throw badRequest("Webhook InfinitePay sem referencia V2");
    }

    const event = await this.createProviderEvent(normalized, payload);

    if (event.processing_status !== "pending") {
      return { status: "ignored", reason: "Evento ja recebido" };
    }

    const session = await this.findPaymentSessionForWebhook(normalized);

    if (!session) {
      await this.markProviderEvent(event.id, "ignored", "Checkout V2 nao encontrado");
      return { status: "ignored", reason: "Checkout V2 nao encontrado" };
    }

    await this.supabase
      .from("v2_payment_provider_events")
      .update({ payment_session_id: session.id })
      .eq("id", event.id);

    if (normalized.status === "paid") {
      return this.applyPaidSession(session, normalized, event.id, payload);
    }

    if (["failed", "expired", "cancelled"].includes(normalized.status)) {
      const nextStatus = normalized.status === "cancelled" ? "cancelled" : normalized.status;
      await this.supabase.from("v2_payment_sessions").update({ status: nextStatus }).eq("id", session.id);
      await this.releaseOrdersFromFailedSession(session.id);
      await this.markProviderEvent(event.id, "processed");
      return { status: "processed", paymentStatus: normalized.status };
    }

    await this.markProviderEvent(event.id, "ignored", "Status nao mapeado");
    return { status: "ignored", reason: "Status nao mapeado" };
  }

  private async getActiveCustomer(customerId: string) {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id,name,email,phone,status")
      .eq("id", customerId)
      .maybeSingle<CustomerRow>();

    if (error) {
      throwQueryError(error, "Falha ao validar cliente V2");
    }

    if (!data) {
      throw notFound("Cliente nao encontrado");
    }

    if (data.status === "blocked") {
      throw conflict("Cliente bloqueado nao pode receber pedido");
    }

    return data;
  }

  private async getCompetenceForDate(orderDate: string) {
    const { data, error } = await this.supabase
      .from("v2_order_competencies")
      .select("id,code,label,starts_on,ends_on,status")
      .lte("starts_on", orderDate)
      .gte("ends_on", orderDate)
      .neq("status", "archived")
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle<CompetenceRow>();

    if (error) {
      throwQueryError(error, "Falha ao localizar competencia V2");
    }

    if (!data) {
      throw badRequest(`Cadastre uma competencia V2 cobrindo a data ${orderDate}`);
    }

    return data;
  }

  private async enrichItem(input: V2OrderItemInput): Promise<EnrichedV2OrderItem> {
    let itemContext: EnrichedV2OrderItem["itemContext"] = "general";
    let productId: string | null = null;
    let productName = input.productName?.trim() ?? "";
    let productSku = input.productSku?.trim() || null;
    let supplierId: string | null = null;
    let unitPrice = input.unitPrice;

    if (input.productVariantId) {
      const { data: variant, error } = await this.supabase
        .from("product_variants")
        .select("id,product_id,sku,sale_price,products(id,name,supplier_id)")
        .eq("id", input.productVariantId)
        .maybeSingle<{
          id: string;
          product_id: string;
          products?: { id?: string; name?: string; supplier_id?: string | null } | Array<{ id?: string; name?: string; supplier_id?: string | null }> | null;
          sale_price: number | string;
          sku: string;
        }>();

      if (error) {
        throwQueryError(error, "Falha ao validar produto do pedido V2");
      }

      if (!variant) {
        throw notFound("Produto do pedido V2 nao encontrado");
      }

      const product = firstRelation(variant.products);
      productId = product?.id ?? variant.product_id;
      supplierId = product?.supplier_id ?? null;
      itemContext = supplierId ? "supplier" : "general";
      productName = productName || product?.name || variant.sku;
      productSku = productSku ?? variant.sku;
      unitPrice = unitPrice ?? Number(variant.sale_price);
    }

    if (!productName) {
      throw badRequest("Informe o nome do produto do pedido V2");
    }

    if (unitPrice === undefined || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw badRequest(`Informe o preco de ${productName}`);
    }

    return {
      itemContext,
      productId,
      productName,
      productSku,
      productVariantId: input.productVariantId ?? null,
      quantity: input.quantity,
      supplierId,
      unitPrice: roundMoney(unitPrice),
    };
  }

  private async insertOrderWithItems(input: {
    approvalStatus: z.infer<typeof v2ApprovalStatusSchema>;
    competence: CompetenceRow;
    couponCode?: string | null;
    couponId?: string | null;
    customer: CustomerRow;
    discount?: number;
    fulfillmentStatus: z.infer<typeof v2FulfillmentStatusSchema>;
    internalNotes: string | null;
    items: EnrichedV2OrderItem[];
    notes: string | null;
    orderDate: string;
    paymentStatus: z.infer<typeof v2PaymentStatusSchema>;
    seller?: "daniel" | "allana" | null;
    source: "admin_whatsapp" | "admin_manual" | "site";
    visibleActorId?: string;
  }) {
    const subtotal = roundMoney(
      input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    );
    const now = nowIso();
    const { data: order, error } = await this.supabase
      .from("v2_orders")
      .insert({
        approval_status: input.approvalStatus,
        competence_id: input.competence.id,
        coupon_code: input.couponCode ?? null,
        coupon_id: input.couponId ?? null,
        created_by: input.visibleActorId ?? this.actorId ?? null,
        customer_id: input.customer.id,
        discount: input.discount ?? 0,
        fulfillment_status: input.fulfillmentStatus,
        internal_notes: input.internalNotes,
        notes: input.notes,
        order_date: input.orderDate,
        order_number: createNumber("SFV2"),
        payment_status: input.paymentStatus,
        reviewed_at: input.approvalStatus === "aprovado" ? now : null,
        reviewed_by: input.approvalStatus === "aprovado" ? this.actorId ?? null : null,
        seller: input.seller ?? null,
        source: input.source,
        subtotal,
      })
      .select("id,order_number,customer_id")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar pedido V2");
    }

    const { error: itemError } = await this.supabase.from("v2_order_items").insert(
      input.items.map((item) => ({
        order_id: order.id,
        item_context: item.itemContext,
        product_id: item.productId,
        product_name: item.productName,
        product_sku: item.productSku,
        product_variant_id: item.productVariantId,
        quantity: item.quantity,
        supplier_id: item.supplierId,
        unit_price: item.unitPrice,
      })),
    );

    if (itemError) {
      await this.supabase.from("v2_orders").delete().eq("id", order.id);
      throwQueryError(itemError, "Falha ao criar itens do pedido V2");
    }

    await this.addEvent({
      actorId: input.visibleActorId ?? this.actorId,
      customerId: input.customer.id,
      eventType: "order.created",
      metadata: {
        competenceCode: input.competence.code,
        source: input.source,
      },
      notes: input.source === "site" ? "Pedido criado pelo site aguardando aprovacao" : "Pedido lancado pelo admin",
      orderId: order.id,
      toStatus: `${input.approvalStatus}/${input.paymentStatus}/${input.fulfillmentStatus}`,
    });

    return this.getAdminOrderById(order.id);
  }

  private async getOrderCore(orderId: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(`
        id,order_number,customer_id,competence_id,approval_status,payment_status,fulfillment_status,
        total,tracking_code,tracking_url,requested_at,received_at,shipped_at,refund_notes
      `)
      .eq("id", orderId)
      .maybeSingle<{
        approval_status: string;
        competence_id: string;
        customer_id: string;
        fulfillment_status: string;
        id: string;
        order_number: string;
        payment_status: string;
        received_at: string | null;
        refund_notes: string | null;
        requested_at: string | null;
        shipped_at: string | null;
        total: number | string;
        tracking_code: string | null;
        tracking_url: string | null;
      }>();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido V2");
    }

    if (!data) {
      throw notFound("Pedido V2 nao encontrado");
    }

    return data;
  }

  private async getOrderCores(orderIds: string[]) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(`
        id,order_number,customer_id,competence_id,approval_status,payment_status,fulfillment_status,
        total,tracking_code,tracking_url,requested_at,received_at,shipped_at,refund_notes
      `)
      .in("id", orderIds);

    if (error) {
      throwQueryError(error, "Falha ao buscar pedidos V2");
    }

    if ((data ?? []).length !== orderIds.length) {
      throw notFound("Um ou mais pedidos V2 nao foram encontrados");
    }

    return data as Array<{
      approval_status: string;
      competence_id: string;
      customer_id: string;
      fulfillment_status: string;
      id: string;
      order_number: string;
      payment_status: string;
      received_at: string | null;
      refund_notes: string | null;
      requested_at: string | null;
      shipped_at: string | null;
      total: number | string;
      tracking_code: string | null;
      tracking_url: string | null;
    }>;
  }

  private async getOrdersForPayment(orderIds: string[]) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(`
        id,order_number,customer_id,competence_id,approval_status,payment_status,fulfillment_status,total,customer_visible,
        customers(id,name,email,phone,status),
        v2_order_items(id,product_name,quantity,unit_price,total_price)
      `)
      .in("id", orderIds);

    if (error) {
      throwQueryError(error, "Falha ao buscar pedidos para checkout V2");
    }

    return (data ?? []) as unknown as V2OrderRow[];
  }

  private createInfinitePayItems(orders: V2OrderRow[]) {
    return orders.flatMap((order) => {
      const items = order.v2_order_items ?? [];

      if (items.length === 0) {
        return [{
          name: order.order_number,
          quantity: 1,
          unitAmountCents: Math.round(Number(order.total) * 100),
        }];
      }

      return items.map((item) => ({
        name: `${order.order_number} - ${item.product_name}`,
        quantity: Number(item.quantity),
        unitAmountCents: Math.round(Number(item.unit_price) * 100),
      }));
    });
  }

  private async supersedePendingSessionsForOrders(orderIds: string[], customerId: string) {
    const { data, error } = await this.supabase
      .from("v2_payment_session_orders")
      .select("payment_session_id,v2_payment_sessions(id,status,customer_id)")
      .in("order_id", orderIds);

    if (error) {
      throwQueryError(error, "Falha ao validar checkouts pendentes V2");
    }

    const pendingSessionIds = uniqueValues(
      ((data ?? []) as Array<{
        payment_session_id: string;
        v2_payment_sessions?: { customer_id?: string; id?: string; status?: string } | Array<{ customer_id?: string; id?: string; status?: string }> | null;
      }>)
        .map((row) => firstRelation(row.v2_payment_sessions))
        .filter((session) => session?.status === "pending" && session.customer_id === customerId)
        .map((session) => session?.id)
        .filter((id): id is string => Boolean(id)),
    );

    if (pendingSessionIds.length === 0) {
      return;
    }

    const { error: updateError } = await this.supabase
      .from("v2_payment_sessions")
      .update({ status: "superseded" })
      .in("id", pendingSessionIds);

    if (updateError) {
      throwQueryError(updateError, "Falha ao substituir checkouts antigos V2");
    }

    await this.supabase
      .from("v2_orders")
      .update({ payment_status: "nao_pago" })
      .in("id", orderIds)
      .eq("payment_status", "checkout_gerado");
  }

  private async getPaymentSessionCore(id: string) {
    const { data, error } = await this.supabase
      .from("v2_payment_sessions")
      .select("id,checkout_number,customer_id,status,amount,payment_link_url,provider_reference,invoice_slug,transaction_nsu")
      .eq("id", id)
      .maybeSingle<V2PaymentSessionRow>();

    if (error) {
      throwQueryError(error, "Falha ao buscar checkout V2");
    }

    if (!data) {
      throw notFound("Checkout V2 nao encontrado");
    }

    return data;
  }

  private async findPaymentSessionForWebhook(normalized: NormalizedInfinitePayWebhook) {
    const references = [
      normalized.orderNumber,
      normalized.providerReference,
      normalized.invoiceSlug,
      normalized.transactionNsu,
    ].filter((value): value is string => Boolean(value));

    for (const reference of uniqueValues(references)) {
      const { data, error } = await this.supabase
        .from("v2_payment_sessions")
        .select("id,checkout_number,customer_id,status,amount,payment_link_url,provider_reference,invoice_slug,transaction_nsu")
        .or(`checkout_number.eq.${reference},provider_reference.eq.${reference},invoice_slug.eq.${reference},transaction_nsu.eq.${reference}`)
        .maybeSingle<V2PaymentSessionRow>();

      if (error) {
        throwQueryError(error, "Falha ao localizar checkout V2 do webhook");
      }

      if (data) {
        return data;
      }
    }

    return null;
  }

  private async applyPaidSession(
    session: V2PaymentSessionRow,
    normalized: NormalizedInfinitePayWebhook,
    eventId: string,
    payload?: unknown,
    actorProfileId?: string | null,
  ) {
    if (session.status === "paid") {
      await this.markProviderEvent(eventId, "ignored", "Checkout ja estava pago");
      return { status: "ignored", reason: "Checkout ja pago" };
    }

    if (session.status === "superseded") {
      await this.markProviderEvent(eventId, "manual_review", "Checkout substituido recebeu pagamento");
      return { status: "manual_review", reason: "Checkout substituido recebeu pagamento" };
    }

    const receivedAmount = centsToCurrency(normalized.paidAmountCents ?? normalized.amountCents);
    const expectedAmount = Number(session.amount);

    if (receivedAmount === null) {
      await this.markProviderEvent(eventId, "manual_review", "Valor pago nao informado");
      return { status: "manual_review", reason: "Valor pago nao informado" };
    }

    if (receivedAmount + 0.01 < expectedAmount) {
      await this.markProviderEvent(eventId, "manual_review", "Valor pago menor que o checkout");
      return { status: "manual_review", reason: "Valor pago menor que o checkout" };
    }

    const now = nowIso();
    const { data: links, error: linksError } = await this.supabase
      .from("v2_payment_session_orders")
      .select("order_id,amount")
      .eq("payment_session_id", session.id);

    if (linksError) {
      await this.markProviderEvent(eventId, "failed", linksError.message);
      throwQueryError(linksError, "Falha ao buscar pedidos do checkout V2");
    }

    const orderIds = (links ?? []).map((link) => link.order_id);

    const { error: sessionError } = await this.supabase
      .from("v2_payment_sessions")
      .update({
        invoice_slug: normalized.invoiceSlug ?? session.invoice_slug,
        paid_amount: receivedAmount,
        paid_at: now,
        paid_installments: normalized.installments,
        payment_link_url: session.payment_link_url,
        provider_fee_amount: centsToCurrency(normalized.providerFeeAmountCents),
        provider_payload: payload ?? null,
        provider_reference: normalized.providerReference ?? session.provider_reference,
        receipt_url: normalized.receiptUrl,
        status: "paid",
        transaction_nsu: normalized.transactionNsu ?? session.transaction_nsu,
      })
      .eq("id", session.id);

    if (sessionError) {
      await this.markProviderEvent(eventId, "failed", sessionError.message);
      throwQueryError(sessionError, "Falha ao marcar checkout V2 como pago");
    }

    const { error: ordersError } = await this.supabase
      .from("v2_orders")
      .update({
        paid_at: now,
        payment_status: "pago",
      })
      .in("id", orderIds);

    if (ordersError) {
      await this.markProviderEvent(eventId, "failed", ordersError.message);
      throwQueryError(ordersError, "Falha ao marcar pedidos V2 como pagos");
    }

    await Promise.all(
      orderIds.map((orderId) => this.addEvent({
        actorId: actorProfileId ?? undefined,
        eventType: "payment.paid",
        metadata: {
          checkoutNumber: session.checkout_number,
          paymentSessionId: session.id,
          providerReference: normalized.providerReference,
          transactionNsu: normalized.transactionNsu,
        },
        notes: "Pagamento confirmado pela InfinitePay",
        orderId,
        paymentSessionId: session.id,
        toStatus: "pago",
      })),
    );

    await this.markProviderEvent(eventId, "processed");

    return {
      orderIds,
      paymentSessionId: session.id,
      status: "processed",
    };
  }

  private async releaseOrdersFromFailedSession(paymentSessionId: string) {
    const { data, error } = await this.supabase
      .from("v2_payment_session_orders")
      .select("order_id")
      .eq("payment_session_id", paymentSessionId);

    if (error) {
      throwQueryError(error, "Falha ao liberar pedidos do checkout V2");
    }

    const orderIds = (data ?? []).map((link) => link.order_id);

    if (orderIds.length === 0) {
      return;
    }

    const { error: updateError } = await this.supabase
      .from("v2_orders")
      .update({ payment_status: "nao_pago" })
      .in("id", orderIds)
      .eq("payment_status", "checkout_gerado");

    if (updateError) {
      throwQueryError(updateError, "Falha ao liberar pedidos V2");
    }
  }

  private async createProviderEvent(normalized: NormalizedInfinitePayWebhook, payload: unknown) {
    const { data, error } = await this.supabase
      .from("v2_payment_provider_events")
      .insert({
        event_id: normalized.eventId,
        event_type: normalized.eventType,
        order_nsu: normalized.orderNumber,
        payload,
        provider: "infinitepay",
        provider_reference: normalized.providerReference,
      })
      .select("id,processing_status")
      .single<{ id: string; processing_status: string }>();

    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await this.supabase
        .from("v2_payment_provider_events")
        .select("id,processing_status")
        .eq("provider", "infinitepay")
        .eq("event_id", normalized.eventId)
        .single<{ id: string; processing_status: string }>();

      if (existingError) {
        throwQueryError(existingError, "Falha ao buscar evento InfinitePay V2 duplicado");
      }

      return {
        ...existing,
        processing_status: existing.processing_status === "pending" ? "ignored" : existing.processing_status,
      };
    }

    if (error) {
      throwQueryError(error, "Falha ao registrar evento InfinitePay V2");
    }

    return data;
  }

  private async markProviderEvent(
    eventId: string,
    status: "processed" | "ignored" | "failed" | "manual_review",
    errorMessage?: string,
  ) {
    const { error } = await this.supabase
      .from("v2_payment_provider_events")
      .update({
        error_message: errorMessage ?? null,
        processed_at: nowIso(),
        processing_status: status,
      })
      .eq("id", eventId);

    if (error) {
      throwQueryError(error, "Falha ao atualizar evento InfinitePay V2");
    }
  }

  private async addEvent(input: {
    actorId?: string | null;
    customerId?: string | null;
    eventType: string;
    fromStatus?: string | null;
    metadata?: Record<string, unknown>;
    notes?: string | null;
    orderId?: string | null;
    paymentSessionId?: string | null;
    toStatus?: string | null;
  }) {
    const { error } = await this.supabase.from("v2_order_events").insert({
      actor_id: input.actorId ?? null,
      customer_id: input.customerId ?? null,
      event_type: input.eventType,
      from_status: input.fromStatus ?? null,
      metadata: input.metadata ?? null,
      notes: input.notes ?? null,
      order_id: input.orderId ?? null,
      payment_session_id: input.paymentSessionId ?? null,
      to_status: input.toStatus ?? null,
    });

    if (error) {
      throwQueryError(error, "Falha ao registrar evento do pedido V2");
    }
  }
}
