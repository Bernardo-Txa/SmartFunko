import "server-only";
import { z } from "zod";
import { env, hasInfinitePayCheckoutEnv } from "@/lib/env";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import {
  checkInfinitePayPaymentStatus,
  createInfinitePayCheckout,
  normalizeInfinitePayWebhook,
  type NormalizedInfinitePayWebhook,
} from "@/server/payments/infinitepay-client";
import { getRafflePaymentRules, type PaymentFeeMode, type PaymentMaxInstallmentsSource } from "@/server/payments/payment-rules";
import { RewardsService } from "@/server/rewards/rewards-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const raffleCampaignStatusSchema = z.enum([
  "draft",
  "open",
  "paused",
  "sold_out",
  "closed",
  "drawn",
  "cancelled",
]);

export const raffleDrawMethodSchema = z.enum(["manual_external", "internal_random"]);

const optionalText = z.string().trim().optional().nullable();
const optionalDateTime = z.string().datetime().optional().nullable();

export const createRaffleCampaignSchema = z.object({
  code: z.string().trim().min(2).optional().nullable(),
  description: optionalText,
  drawAt: optionalDateTime,
  drawMethod: raffleDrawMethodSchema.default("manual_external"),
  drawReference: optionalText,
  endsAt: optionalDateTime,
  legalAuthorizationCode: optionalText,
  legalAuthorizationUrl: optionalText,
  maxNumbersPerCustomer: z.number().int().positive().optional().nullable(),
  numberEnd: z.number().int().positive(),
  numberStart: z.number().int().positive().default(1),
  pricePerNumber: z.number().positive(),
  prizeDescription: optionalText,
  prizeImageUrl: optionalText,
  prizeTitle: z.string().trim().min(2, "Informe o premio"),
  productId: z.string().uuid().optional().nullable(),
  productVariantId: z.string().uuid().optional().nullable(),
  requiresAuthorization: z.boolean().default(false),
  reservationMinutes: z.number().int().positive().default(15),
  rules: optionalText,
  slug: z.string().trim().min(2).optional().nullable(),
  startsAt: optionalDateTime,
  termsAcceptedByAdmin: z.boolean().default(true),
  title: z.string().trim().min(2, "Informe o titulo"),
});

export const updateRaffleCampaignSchema = createRaffleCampaignSchema
  .partial()
  .extend({
    status: raffleCampaignStatusSchema.optional(),
  });

export const reserveRaffleNumbersSchema = z.object({
  numbers: z.array(z.number().int().positive()).min(1).max(100),
});

export const confirmRaffleOrderPaymentSchema = z.object({
  method: z.enum(["pix", "credit_card", "debit_card", "cash", "manual"]).default("manual"),
  notes: optionalText,
  paidAt: z.string().datetime().optional(),
});

export const drawRaffleCampaignSchema = z.object({
  drawNotes: optionalText,
  drawReference: optionalText,
  drawnAt: z.string().datetime().optional(),
  winnerNumber: z.number().int().positive(),
});

export type CreateRaffleCampaignInput = z.infer<typeof createRaffleCampaignSchema>;
export type UpdateRaffleCampaignInput = z.infer<typeof updateRaffleCampaignSchema>;
export type ConfirmRaffleOrderPaymentInput = z.infer<typeof confirmRaffleOrderPaymentSchema>;
export type DrawRaffleCampaignInput = z.infer<typeof drawRaffleCampaignSchema>;

export type RaffleListFilters = {
  limit?: number;
  q?: string;
  status?: string;
};

type RaffleCampaignRow = {
  id: string;
  code: string;
  slug: string;
  status: string;
  title: string;
  number_start: number;
  number_end: number;
  total_numbers: number;
  price_per_number: number | string;
  requires_authorization: boolean;
  legal_authorization_code: string | null;
  rules: string | null;
  draw_method: string | null;
  draw_notes?: string | null;
  draw_reference?: string | null;
  drawn_at?: string | null;
  starts_at: string | null;
  ends_at: string | null;
  draw_at: string | null;
  terms_accepted_by_admin: boolean;
  winner_customer_id?: string | null;
  winner_raffle_number_id?: string | null;
};

type RaffleOrderRow = {
  id: string;
  cash_entry_id: string | null;
  customer_id: string;
  order_number: string;
  paid_amount?: number | string | null;
  payment_link_url?: string | null;
  payment_max_installments?: number | null;
  payment_max_installments_source?: PaymentMaxInstallmentsSource | null;
  payment_fee_mode?: PaymentFeeMode | null;
  payment_provider?: string | null;
  payment_provider_reference?: string | null;
  payment_status?: string | null;
  quantity: number;
  raffle_campaign_id: string;
  receipt_url?: string | null;
  reserved_until?: string | null;
  status: string;
  transaction_nsu?: string | null;
  total_amount: number | string;
  unit_price: number | string;
  customers?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  raffle_campaigns?: {
    code?: string | null;
    slug?: string | null;
    title?: string | null;
  } | null;
  raffle_numbers?: Array<{
    label: string;
  }>;
};

function campaignSelect() {
  return `
    id,code,slug,title,description,prize_title,prize_description,prize_image_url,
    product_id,product_variant_id,status,number_start,number_end,total_numbers,price_per_number,
    max_numbers_per_customer,reservation_minutes,starts_at,ends_at,draw_at,requires_authorization,
    legal_authorization_code,legal_authorization_url,rules,draw_method,draw_reference,terms_accepted_by_admin,
    winner_customer_id,winner_raffle_number_id,drawn_at,draw_notes,created_by,updated_by,created_at,updated_at,
    products(id,name,slug,main_image_url),
    product_variants(id,sku)
  `;
}

function orderSelect() {
  return `
    id,raffle_campaign_id,customer_id,order_number,status,quantity,unit_price,total_amount,
    payment_id,cash_entry_id,reserved_until,paid_at,cancelled_at,expired_at,notes,created_at,updated_at,
    payment_provider,payment_status,payment_link_url,payment_provider_reference,payment_link_created_at,
    payment_link_expires_at,receipt_url,capture_method,transaction_nsu,paid_amount,provider_payload,
    payment_max_installments,payment_max_installments_source,payment_fee_mode,paid_installments,
    provider_payment_method,provider_fee_amount,
    raffle_campaigns(id,code,slug,title,prize_title,draw_at,status),
    customers(id,name,email,phone),
    raffle_numbers(id,number,label,status,reserved_until,sold_at)
  `;
}

function drawAuditSelect() {
  return `
    id,raffle_campaign_id,action,payload,created_by,created_at,
    profiles(name,email)
  `;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createCampaignCode(title: string) {
  const prefix = slugify(title)
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 4))
    .join("")
    .toUpperCase();
  const now = new Date();
  return `RF${now.toISOString().slice(2, 10).replace(/-/g, "")}-${prefix || "CAMP"}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

function toDbPayload(input: Partial<CreateRaffleCampaignInput>) {
  return {
    code: input.code?.trim() || undefined,
    description: input.description ?? null,
    draw_at: input.drawAt ?? null,
    draw_method: input.drawMethod,
    draw_reference: input.drawReference ?? null,
    ends_at: input.endsAt ?? null,
    legal_authorization_code: input.legalAuthorizationCode ?? null,
    legal_authorization_url: input.legalAuthorizationUrl ?? null,
    max_numbers_per_customer: input.maxNumbersPerCustomer ?? null,
    number_end: input.numberEnd,
    number_start: input.numberStart,
    price_per_number: input.pricePerNumber,
    prize_description: input.prizeDescription ?? null,
    prize_image_url: input.prizeImageUrl ?? null,
    prize_title: input.prizeTitle,
    product_id: input.productId ?? null,
    product_variant_id: input.productVariantId ?? null,
    requires_authorization: input.requiresAuthorization,
    reservation_minutes: input.reservationMinutes,
    rules: input.rules ?? null,
    slug: input.slug?.trim() || undefined,
    starts_at: input.startsAt ?? null,
    terms_accepted_by_admin: input.termsAcceptedByAdmin,
    title: input.title,
  };
}

function labelForNumber(number: number, maxNumber: number) {
  return String(number).padStart(String(maxNumber).length, "0");
}

function normalizeQueryText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_").trim();
}

function raffleOrderNsu(orderId: string) {
  return `RAFFLE-${orderId}`;
}

function centsToCurrency(cents: number | null) {
  return cents === null ? null : Number((cents / 100).toFixed(2));
}

function mapCaptureMethod(method: string | null) {
  const normalized = String(method ?? "").toLowerCase();

  if (normalized === "pix") {
    return "pix";
  }

  if (normalized.includes("credit")) {
    return "credit_card";
  }

  if (normalized.includes("debit")) {
    return "debit_card";
  }

  return "infinitepay";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assertDateOrder(input: {
  drawAt?: string | null;
  endsAt?: string | null;
  startsAt?: string | null;
}) {
  if (input.startsAt && input.endsAt && new Date(input.startsAt).getTime() >= new Date(input.endsAt).getTime()) {
    throw badRequest("Data de inicio deve ser anterior ao encerramento");
  }

  if (input.endsAt && input.drawAt && new Date(input.endsAt).getTime() > new Date(input.drawAt).getTime()) {
    throw badRequest("Data de sorteio deve ser igual ou posterior ao encerramento");
  }
}

function assertNumberRange(input: {
  numberEnd?: number;
  numberStart?: number;
}) {
  if (input.numberStart && input.numberEnd && input.numberEnd < input.numberStart) {
    throw badRequest("Numero final deve ser maior ou igual ao inicial");
  }

  if (input.numberStart && input.numberEnd && input.numberEnd - input.numberStart + 1 > 10000) {
    throw badRequest("Limite maximo desta sprint: 10.000 numeros por campanha");
  }
}

function assertPublishReadiness(campaign: RaffleCampaignRow) {
  const missing: string[] = [];

  if (!campaign.rules?.trim()) {
    missing.push("regulamento");
  }

  if (!campaign.starts_at) {
    missing.push("data de inicio");
  }

  if (!campaign.ends_at) {
    missing.push("data de encerramento");
  }

  if (!campaign.draw_at) {
    missing.push("data de sorteio");
  }

  if (!campaign.draw_method) {
    missing.push("metodo de sorteio");
  }

  if (missing.length > 0) {
    throw conflict(`Complete os dados operacionais antes de abrir: ${missing.join(", ")}`);
  }
}

function statusAllowsPublicRead(status: string) {
  return ["open", "sold_out", "closed", "drawn"].includes(status);
}

export class RaffleService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listRaffleCampaigns(filters: RaffleListFilters = {}) {
    await this.expireRaffleReservations();

    const limit = Math.min(200, Math.max(1, Number(filters.limit ?? 100)));
    let query = this.supabase
      .from("raffle_campaigns")
      .select(campaignSelect())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.q?.trim()) {
      const q = normalizeQueryText(filters.q);
      query = query.or(`title.ilike.%${q}%,code.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar rifas");
    }

    return this.attachCampaignStats((data ?? []) as unknown as RaffleCampaignRow[]);
  }

  async getRaffleCampaignById(id: string) {
    await this.expireRaffleReservations();

    const { data, error } = await this.supabase
      .from("raffle_campaigns")
      .select(campaignSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar rifa");
    }

    if (!data) {
      throw notFound("Rifa nao encontrada");
    }

    const [campaign] = await this.attachCampaignStats([data as unknown as RaffleCampaignRow]);
    return campaign;
  }

  async getRaffleCampaignBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from("raffle_campaigns")
      .select(campaignSelect())
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar rifa");
    }

    if (!data) {
      throw notFound("Rifa nao encontrada");
    }

    const [campaign] = await this.attachCampaignStats([data as unknown as RaffleCampaignRow]);
    return campaign;
  }

  async createRaffleCampaign(input: CreateRaffleCampaignInput, actorProfileId = this.actorId) {
    assertDateOrder(input);
    assertNumberRange(input);

    const code = input.code?.trim() || createCampaignCode(input.title);
    const slug = input.slug?.trim() || slugify(`${input.title}-${code}`);
    const numberStart = input.numberStart;
    const numberEnd = input.numberEnd;
    const totalNumbers = numberEnd - numberStart + 1;

    const payload = {
      ...toDbPayload(input),
      code,
      created_by: actorProfileId ?? null,
      number_end: numberEnd,
      number_start: numberStart,
      slug,
      total_numbers: totalNumbers,
      updated_by: actorProfileId ?? null,
    };

    const { data, error } = await this.supabase
      .from("raffle_campaigns")
      .insert(payload)
      .select(campaignSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar rifa");
    }

    const createdCampaign = data as unknown as RaffleCampaignRow;
    const numbers = Array.from({ length: totalNumbers }, (_, index) => {
      const number = numberStart + index;
      return {
        label: labelForNumber(number, numberEnd),
        number,
        raffle_campaign_id: createdCampaign.id,
      };
    });

    const { error: numbersError } = await this.supabase.from("raffle_numbers").insert(numbers);

    if (numbersError) {
      throwQueryError(numbersError, "Falha ao gerar numeros da rifa");
    }

    await this.audit.createAdminActionLog({
      action: "raffle.create",
      adminId: actorProfileId,
      entityId: createdCampaign.id,
      entityType: "raffle_campaign",
      newValue: data,
    });

    await this.createDrawAudit(createdCampaign.id, "campaign.created", data, actorProfileId);
    return this.getRaffleCampaignById(createdCampaign.id);
  }

  async updateRaffleCampaign(id: string, input: UpdateRaffleCampaignInput, actorProfileId = this.actorId) {
    const current = (await this.getRaffleCampaignById(id)) as unknown as RaffleCampaignRow & {
      stats?: { sold: number };
    };

    assertDateOrder({
      drawAt: input.drawAt ?? current.draw_at,
      endsAt: input.endsAt ?? current.ends_at,
      startsAt: input.startsAt ?? current.starts_at,
    });

    if (input.numberStart !== undefined || input.numberEnd !== undefined) {
      throw conflict("Intervalo de numeros nao pode ser alterado depois da criacao");
    }

    if (input.pricePerNumber !== undefined && current.stats && current.stats.sold > 0) {
      throw conflict("Preco nao pode ser alterado depois de vendas confirmadas");
    }

    const payload = {
      ...toDbPayload(input),
      status: input.status,
      updated_by: actorProfileId ?? null,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    const { data, error } = await this.supabase
      .from("raffle_campaigns")
      .update(payload)
      .eq("id", id)
      .select(campaignSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar rifa");
    }

    await this.audit.createAdminActionLog({
      action: "raffle.update",
      adminId: actorProfileId,
      entityId: id,
      entityType: "raffle_campaign",
      oldValue: current,
      newValue: data,
    });

    await this.createDrawAudit(id, "campaign.updated", payload, actorProfileId);
    return this.getRaffleCampaignById(id);
  }

  async openRaffleCampaign(id: string, actorProfileId = this.actorId) {
    const campaign = (await this.getRaffleCampaignById(id)) as unknown as RaffleCampaignRow;

    if (campaign.status === "cancelled" || campaign.status === "drawn") {
      throw conflict("Rifa com este status nao pode ser aberta");
    }

    if (process.env.NODE_ENV === "production") {
      assertPublishReadiness(campaign);
    }

    return this.changeCampaignStatus(id, "open", "raffle.open", actorProfileId);
  }

  async publishRaffleCampaign(id: string, actorProfileId = this.actorId) {
    return this.openRaffleCampaign(id, actorProfileId);
  }

  async pauseRaffleCampaign(id: string, actorProfileId = this.actorId) {
    return this.changeCampaignStatus(id, "paused", "raffle.pause", actorProfileId);
  }

  async closeRaffleCampaign(id: string, actorProfileId = this.actorId) {
    return this.changeCampaignStatus(id, "closed", "raffle.close", actorProfileId);
  }

  async cancelRaffleCampaign(id: string, actorProfileId = this.actorId) {
    const campaign = await this.changeCampaignStatus(id, "cancelled", "raffle.cancel", actorProfileId);
    const { error } = await this.supabase
      .from("raffle_numbers")
      .update({
        cancelled_at: new Date().toISOString(),
        status: "cancelled",
      })
      .eq("raffle_campaign_id", id)
      .in("status", ["available", "pending_payment"]);

    if (error) {
      throwQueryError(error, "Falha ao cancelar numeros da rifa");
    }

    return campaign;
  }

  async drawRaffleCampaign(id: string, input: DrawRaffleCampaignInput, actorProfileId = this.actorId) {
    const campaign = (await this.getRaffleCampaignById(id)) as unknown as RaffleCampaignRow;

    if (!["closed", "sold_out"].includes(campaign.status)) {
      throw conflict("Encerre a rifa antes de registrar o sorteio");
    }

    if (campaign.winner_raffle_number_id || campaign.status === "drawn") {
      throw conflict("Rifa ja foi sorteada");
    }

    const { data: number, error: numberError } = await this.supabase
      .from("raffle_numbers")
      .select("id,number,label,status,customer_id")
      .eq("raffle_campaign_id", id)
      .eq("number", input.winnerNumber)
      .maybeSingle();

    if (numberError) {
      throwQueryError(numberError, "Falha ao validar numero vencedor");
    }

    if (!number) {
      throw notFound("Numero vencedor nao encontrado");
    }

    if (number.status !== "sold") {
      throw conflict("Numero vencedor precisa estar comprado");
    }

    const drawnAt = input.drawnAt ?? new Date().toISOString();
    const drawReference = input.drawReference?.trim() || "manual-dev";
    const { data, error } = await this.supabase
      .from("raffle_campaigns")
      .update({
        draw_notes: input.drawNotes ?? null,
        draw_reference: drawReference,
        drawn_at: drawnAt,
        status: "drawn",
        updated_by: actorProfileId ?? null,
        winner_customer_id: number.customer_id,
        winner_raffle_number_id: number.id,
      })
      .eq("id", id)
      .select(campaignSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao registrar sorteio");
    }

    const drawnCampaign = data as unknown as RaffleCampaignRow;
    const { error: winnerError } = await this.supabase
      .from("raffle_numbers")
      .update({ status: "winner" })
      .eq("id", number.id);

    if (winnerError) {
      throwQueryError(winnerError, "Falha ao marcar numero premiado");
    }

    await this.audit.createAdminActionLog({
      action: "raffle.draw",
      adminId: actorProfileId,
      entityId: id,
      entityType: "raffle_campaign",
      oldValue: campaign,
      newValue: { ...drawnCampaign, winner_number: number },
    });

    await this.createDrawAudit(
      id,
      "campaign.drawn",
      {
        drawReference,
        drawnAt,
        winnerNumber: number,
      },
      actorProfileId,
    );

    return this.getRaffleCampaignById(id);
  }

  async listRaffleOrders(campaignId?: string, filters: RaffleListFilters = {}) {
    await this.expireRaffleReservations();

    let query = this.supabase
      .from("raffle_orders")
      .select(orderSelect())
      .order("created_at", { ascending: false })
      .limit(Math.min(300, Math.max(1, Number(filters.limit ?? 200))));

    if (campaignId) {
      query = query.eq("raffle_campaign_id", campaignId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar pedidos de rifa");
    }

    const search = filters.q?.trim().toLowerCase();

    if (!search) {
      return data ?? [];
    }

    return (data ?? []).filter((order) => {
      const row = order as {
        order_number?: string | null;
        customers?: { name?: string | null; email?: string | null } | null;
      };
      return [row.order_number, row.customers?.name, row.customers?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }

  async getRaffleOrderById(id: string) {
    const { data, error } = await this.supabase
      .from("raffle_orders")
      .select(orderSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido de rifa");
    }

    if (!data) {
      throw notFound("Pedido de rifa nao encontrado");
    }

    return data;
  }

  async confirmRaffleOrderPayment(
    orderId: string,
    input: ConfirmRaffleOrderPaymentInput,
    actorProfileId = this.actorId,
  ) {
    const order = (await this.getRaffleOrderById(orderId)) as unknown as RaffleOrderRow & {
      raffle_campaigns?: { code?: string; title?: string } | null;
    };

    if (order.status === "paid") {
      throw conflict("Pedido de rifa ja esta pago");
    }

    if (order.status !== "pending_payment") {
      throw conflict("Pedido de rifa com este status nao recebe pagamento");
    }

    const now = new Date();
    const paidAt = input.paidAt ?? now.toISOString();
    const { data: cashEntry, error: cashError } = await this.supabase
      .from("cash_entries")
      .insert({
        amount: Number(order.total_amount),
        category: "raffle",
        created_by: actorProfileId ?? null,
        description: `Rifa ${order.raffle_campaigns?.code ?? order.raffle_campaign_id} - pedido ${order.order_number}`,
        occurred_at: paidAt,
        type: "income",
      })
      .select("id,type,category,amount,description,occurred_at,created_at")
      .single();

    if (cashError) {
      throwQueryError(cashError, "Falha ao registrar entrada de caixa da rifa");
    }

    const { data, error } = await this.supabase
      .from("raffle_orders")
      .update({
        cash_entry_id: cashEntry.id,
        capture_method: input.method,
        notes: input.notes ?? null,
        paid_at: paidAt,
        paid_amount: Number(order.total_amount),
        payment_status: "paid",
        status: "paid",
      })
      .eq("id", orderId)
      .select(orderSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao confirmar pagamento da rifa");
    }

    const { error: numberError } = await this.supabase
      .from("raffle_numbers")
      .update({
        reserved_until: null,
        sold_at: paidAt,
        status: "sold",
      })
      .eq("raffle_order_id", orderId);

    if (numberError) {
      throwQueryError(numberError, "Falha ao marcar numeros como comprados");
    }

    await this.audit.createAdminActionLog({
      action: "raffle_order.confirm_payment",
      adminId: actorProfileId,
      entityId: orderId,
      entityType: "raffle_order",
      oldValue: order,
      newValue: { order: data, cashEntry, method: input.method },
    });

    await this.createDrawAudit(
      order.raffle_campaign_id,
      "order.payment_confirmed",
      { cashEntry, method: input.method, orderId },
      actorProfileId,
    );
    await this.safeAwardRaffleOrderPoints(orderId, actorProfileId);

    return data;
  }

  async generateRafflePaymentLink(raffleOrderId: string, actorProfileId = this.actorId, baseUrl = env.siteUrl) {
    const order = (await this.getRaffleOrderById(raffleOrderId)) as unknown as RaffleOrderRow;

    if (order.status === "paid") {
      throw conflict("Pedido de rifa pago nao precisa de novo link");
    }

    if (order.status !== "pending_payment") {
      throw conflict("Somente reserva pendente pode gerar link InfinitePay");
    }

    const result = await this.createInfinitePayLinkForRaffleOrder(order, baseUrl);
    const paymentRules = getRafflePaymentRules();

    console.info(
      `[InfinitePay] raffle payment link created orderId=${raffleOrderId} feeMode=${paymentRules.feeMode} maxInstallments=${paymentRules.maxInstallments}`,
    );

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("raffle_orders")
      .update({
        payment_fee_mode: paymentRules.feeMode,
        payment_link_created_at: now,
        payment_link_url: result.checkoutUrl,
        payment_max_installments: paymentRules.maxInstallments,
        payment_max_installments_source: paymentRules.maxInstallmentsSource,
        payment_provider: "infinitepay",
        payment_provider_reference: result.providerReference,
        payment_status: "pending",
        provider_payload: {
          request: result.requestPayload,
          response: result.raw,
        },
      })
      .eq("id", raffleOrderId)
      .select(orderSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao salvar link InfinitePay da rifa");
    }

    await this.audit.createAdminActionLog({
      action: "raffle_order.payment_link_generated",
      adminId: actorProfileId ?? undefined,
      entityId: raffleOrderId,
      entityType: "raffle_order",
      newValue: data,
      oldValue: order,
    });

    await this.createDrawAudit(
      order.raffle_campaign_id,
      "order.payment_link_generated",
      {
        orderId: raffleOrderId,
        orderNsu: raffleOrderNsu(raffleOrderId),
        providerReference: result.providerReference,
      },
      actorProfileId,
    );

    return {
      checkoutUrl: result.checkoutUrl,
      order: data,
      providerReference: result.providerReference,
    };
  }

  async cancelRaffleOrder(orderId: string, actorProfileId = this.actorId) {
    const order = (await this.getRaffleOrderById(orderId)) as unknown as RaffleOrderRow;

    if (order.status === "paid") {
      throw conflict("Pedido pago nao pode ser cancelado nesta sprint");
    }

    const cancelledAt = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("raffle_orders")
      .update({
        cancelled_at: cancelledAt,
        status: "cancelled",
      })
      .eq("id", orderId)
      .select(orderSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao cancelar pedido de rifa");
    }

    const { error: numbersError } = await this.supabase
      .from("raffle_numbers")
      .update({
        customer_id: null,
        raffle_order_id: null,
        reserved_until: null,
        status: "available",
      })
      .eq("raffle_order_id", orderId)
      .eq("status", "pending_payment");

    if (numbersError) {
      throwQueryError(numbersError, "Falha ao liberar numeros da rifa");
    }

    await this.audit.createAdminActionLog({
      action: "raffle_order.cancel",
      adminId: actorProfileId,
      entityId: orderId,
      entityType: "raffle_order",
      oldValue: order,
      newValue: data,
    });

    await this.createDrawAudit(order.raffle_campaign_id, "order.cancelled", { orderId }, actorProfileId);
    return data;
  }

  private async safeAwardRaffleOrderPoints(orderId: string, actorProfileId?: string | null) {
    try {
      await new RewardsService(this.supabase, actorProfileId).awardRaffleOrderPoints(orderId);
    } catch (error) {
      console.error("Falha ao registrar pontos da rifa", error);
    }
  }

  async listPublicRaffleCampaigns() {
    await this.expireRaffleReservations();

    const { data, error } = await this.supabase
      .from("raffle_campaigns")
      .select(campaignSelect())
      .eq("status", "open")
      .order("draw_at", { ascending: true, nullsFirst: false });

    if (error) {
      throwQueryError(error, "Falha ao listar rifas publicas");
    }

    return this.attachCampaignStats((data ?? []) as unknown as RaffleCampaignRow[]);
  }

  async getPublicRaffleCampaignBySlug(slug: string) {
    const campaign = (await this.getRaffleCampaignBySlug(slug)) as unknown as RaffleCampaignRow;

    if (!statusAllowsPublicRead(campaign.status)) {
      throw notFound("Rifa nao encontrada");
    }

    return campaign;
  }

  async listPublicRaffleNumbers(campaignId: string) {
    await this.expireRaffleReservations();

    const { data, error } = await this.supabase
      .from("raffle_numbers")
      .select("id,raffle_campaign_id,number,label,status,reserved_until,sold_at")
      .eq("raffle_campaign_id", campaignId)
      .order("number", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao listar numeros da rifa");
    }

    return data ?? [];
  }

  async reserveRaffleNumbers(campaignId: string, numbers: number[], customerId: string) {
    const { data, error } = await this.supabase.rpc("reserve_raffle_numbers", {
      p_campaign_id: campaignId,
      p_customer_id: customerId,
      p_numbers: numbers,
    });

    if (error) {
      this.throwFriendlyReservationError(error);
    }

    const reservation = data as {
      numbers: string[];
      orderId: string;
      orderNumber: string;
      reservedUntil: string;
      totalAmount: number;
    };

    let paymentLinkUrl: string | null = null;

    if (hasInfinitePayCheckoutEnv()) {
      try {
        const link = await this.generateRafflePaymentLink(reservation.orderId, undefined);
        paymentLinkUrl = link.checkoutUrl;
      } catch (linkError) {
        console.error("Falha ao gerar link InfinitePay da rifa", linkError);
      }
    }

    return {
      ...reservation,
      paymentLinkUrl,
      paymentStatus: "pending" as const,
    };
  }

  async getMyRaffleOrders(customerId: string) {
    await this.expireRaffleReservations();

    const { data, error } = await this.supabase
      .from("raffle_orders")
      .select(orderSelect())
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar suas rifas");
    }

    return data ?? [];
  }

  async getMyRaffleOrderById(orderId: string, customerId: string) {
    await this.expireRaffleReservations();

    const { data, error } = await this.supabase
      .from("raffle_orders")
      .select(orderSelect())
      .eq("id", orderId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar sua rifa");
    }

    if (!data) {
      throw notFound("Pedido de rifa nao encontrado");
    }

    return data;
  }

  async expireRaffleReservations() {
    const { data, error } = await this.supabase.rpc("expire_raffle_reservations");

    if (error) {
      throwQueryError(error, "Falha ao expirar reservas de rifa");
    }

    return Number(data ?? 0);
  }

  async handleInfinitePayWebhook(payload: unknown) {
    const normalized = normalizeInfinitePayWebhook(payload);

    if (!normalized.eventId || !normalized.providerReference) {
      throw badRequest("Webhook InfinitePay sem referencia de rifa");
    }

    const event = await this.createProviderEvent(normalized, payload);

    if (event.processing_status !== "pending") {
      return { status: "ignored", reason: "Evento ja recebido" };
    }

    const order = await this.findRaffleOrderForWebhook(normalized);

    if (!order) {
      await this.markProviderEvent(event.id, "ignored", "Pedido de rifa nao encontrado");
      return { status: "ignored", reason: "Pedido de rifa nao encontrado" };
    }

    if (normalized.status === "paid") {
      return this.applyPaidRaffleWebhook(order, normalized, event.id, payload);
    }

    if (["failed", "expired", "cancelled"].includes(normalized.status)) {
      await this.supabase
        .from("raffle_orders")
        .update({
          payment_status: normalized.status,
          provider_payload: payload,
        })
        .eq("id", order.id)
        .eq("status", "pending_payment");
      await this.markProviderEvent(event.id, "processed");
      return { status: "processed", paymentStatus: normalized.status };
    }

    await this.markProviderEvent(event.id, "ignored", "Status nao mapeado");
    return { status: "ignored", reason: "Status nao mapeado" };
  }

  async syncRafflePayment(
    raffleOrderId: string,
    actorProfileId = this.actorId,
    options: { slug?: string | null; transactionNsu?: string | null } = {},
  ) {
    const order = (await this.getRaffleOrderById(raffleOrderId)) as unknown as RaffleOrderRow;

    if (!order.payment_link_url) {
      throw conflict("Pedido de rifa ainda nao tem link InfinitePay");
    }

    if (order.status === "paid") {
      return { paid: true, status: "ignored", reason: "Pedido de rifa ja pago" };
    }

    const check = await checkInfinitePayPaymentStatus({
      orderNumber: raffleOrderNsu(order.id),
      slug:
        options.slug ??
        (order.payment_provider_reference && order.payment_provider_reference !== raffleOrderNsu(order.id)
          ? order.payment_provider_reference
          : null),
      transactionNsu: options.transactionNsu ?? order.transaction_nsu ?? null,
    });
    const event = await this.createProviderEvent(check.normalized, check.raw);

    if (check.normalized.status === "paid") {
      const result = await this.applyPaidRaffleWebhook(order, check.normalized, event.id, check.raw);
      await this.audit.createAdminActionLog({
        action: "raffle_order.payment_check_paid",
        adminId: actorProfileId ?? undefined,
        entityId: order.id,
        entityType: "raffle_order",
        newValue: result,
        oldValue: order,
      });
      return { ...result, paid: true };
    }

    await this.markProviderEvent(event.id, "ignored", "Pagamento da rifa ainda nao confirmado");
    return {
      paid: false,
      status: "pending",
    };
  }

  async listRaffleAuditLogs(campaignId: string) {
    const { data, error } = await this.supabase
      .from("raffle_draw_audit_logs")
      .select(drawAuditSelect())
      .eq("raffle_campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throwQueryError(error, "Falha ao listar auditoria da rifa");
    }

    return data ?? [];
  }

  private async createInfinitePayLinkForRaffleOrder(order: RaffleOrderRow, baseUrl = env.siteUrl) {
    if (!hasInfinitePayCheckoutEnv()) {
      throw conflict("Configure INFINITEPAY_HANDLE antes de gerar link de pagamento");
    }

    const labels = (order.raffle_numbers ?? []).map((number) => number.label).join(", ");
    const campaignCode = order.raffle_campaigns?.code ?? order.raffle_campaign_id;
    const paymentRules = getRafflePaymentRules();

    return createInfinitePayCheckout({
      amountCents: Math.round(Number(order.total_amount) * 100),
      customerEmail: order.customers?.email ?? null,
      customerName: order.customers?.name ?? "Cliente Smart Funkos",
      customerPhone: order.customers?.phone ?? null,
      feeMode: paymentRules.feeMode,
      items: [
        {
          name: `Rifa ${campaignCode} - numeros ${labels || order.quantity}`,
          quantity: 1,
          unitAmountCents: Math.round(Number(order.total_amount) * 100),
        },
      ],
      maxInstallments: paymentRules.maxInstallments,
      orderNumber: raffleOrderNsu(order.id),
      redirectUrl: `${baseUrl}/conta/rifas/${order.id}`,
      webhookUrl: `${baseUrl}/api/v1/webhooks/infinitepay`,
    });
  }

  private async findRaffleOrderForWebhook(normalized: NormalizedInfinitePayWebhook) {
    const orderId = normalized.orderNumber?.startsWith("RAFFLE-")
      ? normalized.orderNumber.replace(/^RAFFLE-/, "")
      : null;
    const references = [
      orderId,
      normalized.providerReference,
      normalized.invoiceSlug,
      normalized.transactionNsu,
    ].filter(Boolean) as string[];

    for (const reference of references) {
      const filters = [
        `payment_provider_reference.eq.${reference}`,
        `transaction_nsu.eq.${reference}`,
        ...(isUuid(reference) ? [`id.eq.${reference}`] : []),
      ];
      const { data, error } = await this.supabase
        .from("raffle_orders")
        .select(orderSelect())
        .or(filters.join(","))
        .maybeSingle();

      if (error) {
        throwQueryError(error, "Falha ao localizar pedido de rifa do webhook");
      }

      if (data) {
        return data as unknown as RaffleOrderRow;
      }
    }

    return null;
  }

  private async createProviderEvent(normalized: NormalizedInfinitePayWebhook, payload: unknown) {
    const { data, error } = await this.supabase
      .from("payment_provider_events")
      .insert({
        event_id: normalized.eventId,
        event_type: normalized.eventType,
        payload,
        provider: "infinitepay",
        provider_reference: normalized.providerReference,
      })
      .select("id,processing_status")
      .single();

    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await this.supabase
        .from("payment_provider_events")
        .select("id,processing_status")
        .eq("provider", "infinitepay")
        .eq("event_id", normalized.eventId)
        .single();

      if (existingError) {
        throwQueryError(existingError, "Falha ao buscar evento InfinitePay duplicado");
      }

      return {
        ...existing,
        processing_status: existing.processing_status === "pending" ? "ignored" : existing.processing_status,
      };
    }

    if (error) {
      throwQueryError(error, "Falha ao registrar evento InfinitePay da rifa");
    }

    return data;
  }

  private async markProviderEvent(
    eventId: string,
    status: "processed" | "ignored" | "failed" | "manual_review",
    errorMessage?: string,
  ) {
    const { error } = await this.supabase
      .from("payment_provider_events")
      .update({
        error_message: errorMessage ?? null,
        processed_at: new Date().toISOString(),
        processing_status: status,
      })
      .eq("id", eventId);

    if (error) {
      throwQueryError(error, "Falha ao atualizar evento InfinitePay da rifa");
    }
  }

  private async markRafflePaymentManualReview(
    order: RaffleOrderRow,
    normalized: NormalizedInfinitePayWebhook,
    eventId: string,
    reason: string,
    payload: unknown,
  ) {
    const paymentRules = getRafflePaymentRules();

    await this.supabase
      .from("raffle_orders")
      .update({
        capture_method: mapCaptureMethod(normalized.captureMethod),
        paid_installments: normalized.installments,
        paid_amount: centsToCurrency(normalized.paidAmountCents ?? normalized.amountCents),
        payment_fee_mode: paymentRules.feeMode,
        payment_max_installments: paymentRules.maxInstallments,
        payment_max_installments_source: paymentRules.maxInstallmentsSource,
        payment_provider: "infinitepay",
        payment_provider_reference: normalized.invoiceSlug ?? normalized.providerReference,
        payment_status: "manual_review",
        provider_fee_amount: centsToCurrency(normalized.providerFeeAmountCents),
        provider_payload: payload,
        provider_payment_method: normalized.captureMethod,
        receipt_url: normalized.receiptUrl,
        transaction_nsu: normalized.transactionNsu,
      })
      .eq("id", order.id);
    await this.markProviderEvent(eventId, "manual_review", reason);
    await this.createDrawAudit(
      order.raffle_campaign_id,
      "order.payment_manual_review",
      { orderId: order.id, reason, transactionNsu: normalized.transactionNsu },
      undefined,
    );

    return { reason, status: "manual_review" };
  }

  private async applyPaidRaffleWebhook(
    order: RaffleOrderRow,
    normalized: NormalizedInfinitePayWebhook,
    eventId: string,
    payload: unknown,
  ) {
    if (order.status === "paid") {
      await this.markProviderEvent(eventId, "ignored", "Pedido de rifa ja estava pago");
      return { status: "ignored", reason: "Pedido de rifa ja pago" };
    }

    if (order.status !== "pending_payment") {
      return this.markRafflePaymentManualReview(
        order,
        normalized,
        eventId,
        `Pedido de rifa esta ${order.status}; pagamento exige revisao manual`,
        payload,
      );
    }

    if (order.reserved_until && new Date(order.reserved_until).getTime() < Date.now()) {
      return this.markRafflePaymentManualReview(
        order,
        normalized,
        eventId,
        "Pagamento recebido depois da expiracao da reserva",
        payload,
      );
    }

    const expectedCents = Math.round(Number(order.total_amount) * 100);
    const receivedCents = normalized.paidAmountCents ?? normalized.amountCents;

    if (receivedCents === null) {
      return this.markRafflePaymentManualReview(order, normalized, eventId, "Valor pago nao informado", payload);
    }

    if (receivedCents + 1 < expectedCents) {
      return this.markRafflePaymentManualReview(
        order,
        normalized,
        eventId,
        "Valor pago menor que o total da rifa",
        payload,
      );
    }

    const { data: linkedNumbers, error: linkedNumbersError } = await this.supabase
      .from("raffle_numbers")
      .select("id")
      .eq("raffle_order_id", order.id)
      .eq("status", "pending_payment");

    if (linkedNumbersError) {
      await this.markProviderEvent(eventId, "failed", linkedNumbersError.message);
      throwQueryError(linkedNumbersError, "Falha ao validar numeros reservados da rifa");
    }

    if ((linkedNumbers ?? []).length !== order.quantity) {
      return this.markRafflePaymentManualReview(
        order,
        normalized,
        eventId,
        "Numeros da reserva nao estao mais pendentes",
        payload,
      );
    }

    const paidAt = new Date().toISOString();
    const paidAmount = centsToCurrency(receivedCents);
    const paymentRules = getRafflePaymentRules();
    const { data: cashEntry, error: cashError } = await this.supabase
      .from("cash_entries")
      .insert({
        amount: Number(order.total_amount),
        category: "raffle",
        created_by: null,
        description: `Pagamento InfinitePay - Rifa ${order.raffle_campaigns?.code ?? order.raffle_campaign_id} - pedido ${order.order_number}`,
        occurred_at: paidAt,
        type: "income",
      })
      .select("id,type,category,amount,description,occurred_at,created_at")
      .single();

    if (cashError) {
      await this.markProviderEvent(eventId, "failed", cashError.message);
      throwQueryError(cashError, "Falha ao registrar caixa da rifa InfinitePay");
    }

    const { data, error } = await this.supabase
      .from("raffle_orders")
      .update({
        cash_entry_id: cashEntry.id,
        capture_method: mapCaptureMethod(normalized.captureMethod),
        paid_installments: normalized.installments,
        paid_amount: paidAmount,
        paid_at: paidAt,
        payment_fee_mode: paymentRules.feeMode,
        payment_max_installments: paymentRules.maxInstallments,
        payment_max_installments_source: paymentRules.maxInstallmentsSource,
        payment_provider: "infinitepay",
        payment_provider_reference: normalized.invoiceSlug ?? normalized.providerReference,
        payment_status: "paid",
        provider_fee_amount: centsToCurrency(normalized.providerFeeAmountCents),
        provider_payload: payload,
        provider_payment_method: normalized.captureMethod,
        receipt_url: normalized.receiptUrl,
        status: "paid",
        transaction_nsu: normalized.transactionNsu,
      })
      .eq("id", order.id)
      .eq("status", "pending_payment")
      .select(orderSelect())
      .maybeSingle();

    if (error) {
      await this.markProviderEvent(eventId, "failed", error.message);
      throwQueryError(error, "Falha ao confirmar pagamento InfinitePay da rifa");
    }

    if (!data) {
      return this.markRafflePaymentManualReview(
        order,
        normalized,
        eventId,
        "Pedido de rifa mudou de status durante o processamento",
        payload,
      );
    }

    const { error: numberError } = await this.supabase
      .from("raffle_numbers")
      .update({
        reserved_until: null,
        sold_at: paidAt,
        status: "sold",
      })
      .eq("raffle_order_id", order.id)
      .eq("status", "pending_payment");

    if (numberError) {
      await this.markProviderEvent(eventId, "failed", numberError.message);
      throwQueryError(numberError, "Falha ao marcar numeros da rifa como comprados");
    }

    const { count: availableCount, error: availableError } = await this.supabase
      .from("raffle_numbers")
      .select("id", { count: "exact", head: true })
      .eq("raffle_campaign_id", order.raffle_campaign_id)
      .eq("status", "available");

    if (availableError) {
      await this.markProviderEvent(eventId, "failed", availableError.message);
      throwQueryError(availableError, "Falha ao verificar disponibilidade da rifa");
    }

    if ((availableCount ?? 0) === 0) {
      await this.supabase
        .from("raffle_campaigns")
        .update({ status: "sold_out" })
        .eq("id", order.raffle_campaign_id)
        .not("status", "in", "(closed,drawn,cancelled)");
    }

    await this.audit.createAdminActionLog({
      action: "raffle_order.infinitepay_paid",
      adminId: undefined,
      entityId: order.id,
      entityType: "raffle_order",
      oldValue: order,
      newValue: { cashEntry, order: data },
    });

    await this.createDrawAudit(
      order.raffle_campaign_id,
      "order.payment_confirmed_infinitepay",
      {
        cashEntry,
        orderId: order.id,
        paidAmount,
        transactionNsu: normalized.transactionNsu,
      },
      undefined,
    );
    await this.markProviderEvent(eventId, "processed");
    await this.safeAwardRaffleOrderPoints(order.id, null);

    return {
      cashEntryId: cashEntry.id,
      orderId: order.id,
      paymentId: null,
      status: "processed",
    };
  }

  private async changeCampaignStatus(
    id: string,
    status: string,
    action: string,
    actorProfileId = this.actorId,
  ) {
    const current = await this.getRaffleCampaignById(id);
    const { data, error } = await this.supabase
      .from("raffle_campaigns")
      .update({
        status,
        updated_by: actorProfileId ?? null,
      })
      .eq("id", id)
      .select(campaignSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao alterar status da rifa");
    }

    await this.audit.createAdminActionLog({
      action,
      adminId: actorProfileId,
      entityId: id,
      entityType: "raffle_campaign",
      oldValue: current,
      newValue: data,
    });

    await this.createDrawAudit(id, action, { status }, actorProfileId);
    return this.getRaffleCampaignById(id);
  }

  private async attachCampaignStats<T extends { id: string }>(campaigns: T[]) {
    if (campaigns.length === 0) {
      return campaigns.map((campaign) => ({
        ...campaign,
        stats: {
          available: 0,
          pending: 0,
          revenue: 0,
          sold: 0,
          soldPercent: 0,
          total: 0,
        },
      }));
    }

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const { data, error } = await this.supabase
      .from("raffle_numbers")
      .select("raffle_campaign_id,status")
      .in("raffle_campaign_id", campaignIds);

    if (error) {
      throwQueryError(error, "Falha ao resumir numeros da rifa");
    }

    const statsByCampaign = new Map<
      string,
      { available: number; pending: number; sold: number; total: number }
    >();

    for (const campaign of campaigns) {
      statsByCampaign.set(campaign.id, {
        available: 0,
        pending: 0,
        sold: 0,
        total: 0,
      });
    }

    for (const number of data ?? []) {
      const stats = statsByCampaign.get(number.raffle_campaign_id);

      if (!stats) {
        continue;
      }

      stats.total += 1;

      if (number.status === "available") {
        stats.available += 1;
      } else if (number.status === "pending_payment") {
        stats.pending += 1;
      } else if (number.status === "sold" || number.status === "winner") {
        stats.sold += 1;
      }
    }

    return campaigns.map((campaign) => {
      const stats = statsByCampaign.get(campaign.id) ?? {
        available: 0,
        pending: 0,
        sold: 0,
        total: 0,
      };
      const price = Number((campaign as { price_per_number?: number | string }).price_per_number ?? 0);

      return {
        ...campaign,
        stats: {
          ...stats,
          revenue: stats.sold * price,
          soldPercent: stats.total > 0 ? Math.round((stats.sold / stats.total) * 100) : 0,
        },
      };
    });
  }

  private async createDrawAudit(
    campaignId: string,
    action: string,
    payload: unknown,
    actorProfileId = this.actorId,
  ) {
    const { error } = await this.supabase.from("raffle_draw_audit_logs").insert({
      action,
      created_by: actorProfileId ?? null,
      payload: payload ?? null,
      raffle_campaign_id: campaignId,
    });

    if (error) {
      throwQueryError(error, "Falha ao registrar auditoria da rifa");
    }
  }

  private throwFriendlyReservationError(error: Parameters<typeof throwQueryError>[0]): never {
    const message = error?.message?.toLowerCase() ?? "";

    if (message.includes("nao esta aberta")) {
      throw conflict("Esta rifa nao esta aberta para reservas");
    }

    if (message.includes("nao estao disponiveis")) {
      throw conflict("Um ou mais numeros acabaram de ficar indisponiveis");
    }

    if (message.includes("limite de numeros")) {
      throw conflict("Limite de numeros por cliente excedido");
    }

    if (message.includes("encerrada")) {
      throw conflict("Esta rifa ja encerrou");
    }

    if (message.includes("ainda nao iniciou")) {
      throw conflict("Esta rifa ainda nao iniciou");
    }

    if (message.includes("duplicados")) {
      throw badRequest("Remova numeros duplicados da reserva");
    }

    throwQueryError(error, "Falha ao reservar numeros da rifa");
  }
}
