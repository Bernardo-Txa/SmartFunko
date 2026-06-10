import "server-only";
import { z } from "zod";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { badRequest, conflict, notFound } from "@/server/http/errors";
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
  quantity: number;
  raffle_campaign_id: string;
  status: string;
  total_amount: number | string;
  unit_price: number | string;
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
        notes: input.notes ?? null,
        paid_at: paidAt,
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

    return data;
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

    return data as {
      numbers: string[];
      orderId: string;
      orderNumber: string;
      reservedUntil: string;
      totalAmount: number;
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
