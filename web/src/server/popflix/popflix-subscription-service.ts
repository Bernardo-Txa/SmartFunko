import "server-only";
import { z } from "zod";
import { env, hasInfinitePayCheckoutEnv } from "@/lib/env";
import {
  POPFLIX_PLAN_SLUGS,
  getPopFlixPlanBySlug,
  type PopFlixPlanSlug,
} from "@/lib/popflix";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import {
  checkInfinitePayPaymentStatus,
  createInfinitePayCheckout,
  normalizeInfinitePayWebhook,
  type NormalizedInfinitePayWebhook,
} from "@/server/payments/infinitepay-client";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

const popFlixPlanSchema = z.enum(POPFLIX_PLAN_SLUGS);
const optionalText = z.string().trim().optional().nullable();

export const createPopFlixSubscriptionSchema = z.object({
  favoriteFranchises: optionalText.pipe(z.string().max(500).optional().nullable()),
  notes: optionalText.pipe(z.string().max(1000).optional().nullable()),
  plan: popFlixPlanSchema,
}).strict();

export const confirmPopFlixPaymentSchema = z.object({
  method: z.enum(["pix", "credit_card", "debit_card", "cash", "manual", "infinitepay"]).default("manual"),
  notes: optionalText.pipe(z.string().max(1000).optional().nullable()),
  paidAt: z.string().datetime().optional(),
}).strict();

export type CreatePopFlixSubscriptionInput = z.infer<typeof createPopFlixSubscriptionSchema>;
export type ConfirmPopFlixPaymentInput = z.infer<typeof confirmPopFlixPaymentSchema>;

export type PopFlixSubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "paused"
  | "pending_payment";

export type PopFlixPaymentStatus =
  | "cancelled"
  | "expired"
  | "failed"
  | "manual_review"
  | "paid"
  | "pending";

export type ListAdminPopFlixSubscriptionsFilters = {
  paymentStatus?: string;
  plan?: string;
  q?: string;
  status?: string;
};

type PopFlixCustomerRow = {
  email?: string | null;
  id?: string | null;
  name?: string | null;
  phone?: string | null;
};

type PopFlixSubscriptionRow = {
  cancelled_at: string | null;
  capture_method?: string | null;
  cash_entry_id?: string | null;
  created_at: string;
  customer_id: string;
  customers?: PopFlixCustomerRow | null;
  favorite_franchises: string | null;
  id: string;
  last_payment_at: string | null;
  monthly_price: number | string;
  next_billing_at: string | null;
  notes: string | null;
  paid_amount?: number | string | null;
  paid_installments?: number | null;
  payment_link_created_at?: string | null;
  payment_link_url: string | null;
  payment_provider: string | null;
  payment_provider_reference: string | null;
  payment_status?: PopFlixPaymentStatus | null;
  plan: PopFlixPlanSlug;
  provider_fee_amount?: number | string | null;
  provider_payload?: unknown;
  provider_payment_method?: string | null;
  receipt_url?: string | null;
  started_at: string | null;
  status: PopFlixSubscriptionStatus;
  subscription_code: string;
  transaction_nsu?: string | null;
  updated_at: string;
};

function createSubscriptionCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `PF-${date}-${time}-${suffix}`;
}

function subscriptionSelect() {
  return `
    id,subscription_code,customer_id,plan,status,monthly_price,
    favorite_franchises,notes,payment_provider,payment_provider_reference,payment_link_url,
    payment_status,payment_link_created_at,cash_entry_id,receipt_url,capture_method,
    transaction_nsu,paid_amount,paid_installments,provider_fee_amount,provider_payment_method,
    provider_payload,started_at,next_billing_at,last_payment_at,cancelled_at,created_at,updated_at,
    customers(id,name,email,phone)
  `;
}

function moneyToCents(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function centsToCurrency(cents: number | null) {
  return cents === null ? null : Number((cents / 100).toFixed(2));
}

function addMonthsIso(value: string, months: number) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  safeDate.setMonth(safeDate.getMonth() + months);
  return safeDate.toISOString();
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

  if (normalized === "cash") {
    return "cash";
  }

  if (normalized === "manual") {
    return "manual";
  }

  return "infinitepay";
}

function subscriptionPaymentDescription(row: PopFlixSubscriptionRow) {
  const plan = getPopFlixPlanBySlug(row.plan);
  return `PopFlix ${plan.name} - ${row.subscription_code}`;
}

function mapSubscription(row: PopFlixSubscriptionRow) {
  const plan = getPopFlixPlanBySlug(row.plan);

  return {
    cancelledAt: row.cancelled_at,
    captureMethod: row.capture_method ?? null,
    cashEntryId: row.cash_entry_id ?? null,
    createdAt: row.created_at,
    customer: row.customers
      ? {
          email: row.customers.email ?? null,
          id: row.customers.id ?? row.customer_id,
          name: row.customers.name ?? null,
          phone: row.customers.phone ?? null,
        }
      : null,
    customerId: row.customer_id,
    favoriteFranchises: row.favorite_franchises,
    id: row.id,
    lastPaymentAt: row.last_payment_at,
    monthlyPrice: Number(row.monthly_price),
    nextBillingAt: row.next_billing_at,
    notes: row.notes,
    paidAmount: row.paid_amount === null || row.paid_amount === undefined ? null : Number(row.paid_amount),
    paidInstallments: row.paid_installments ?? null,
    paymentLinkCreatedAt: row.payment_link_created_at ?? null,
    paymentLinkUrl: row.payment_link_url,
    paymentProvider: row.payment_provider,
    paymentProviderReference: row.payment_provider_reference,
    paymentStatus: row.payment_status ?? "pending",
    plan,
    providerFeeAmount:
      row.provider_fee_amount === null || row.provider_fee_amount === undefined
        ? null
        : Number(row.provider_fee_amount),
    providerPaymentMethod: row.provider_payment_method ?? null,
    receiptUrl: row.receipt_url ?? null,
    startedAt: row.started_at,
    status: row.status,
    subscriptionCode: row.subscription_code,
    transactionNsu: row.transaction_nsu ?? null,
    updatedAt: row.updated_at,
  };
}

function filterMappedSubscriptions<T extends ReturnType<typeof mapSubscription>>(
  subscriptions: T[],
  filters: ListAdminPopFlixSubscriptionsFilters,
) {
  const search = filters.q?.trim().toLowerCase();

  if (!search) {
    return subscriptions;
  }

  return subscriptions.filter((subscription) => {
    const fields = [
      subscription.subscriptionCode,
      subscription.customer?.name,
      subscription.customer?.email,
      subscription.customer?.phone,
      subscription.favoriteFranchises,
    ];

    return fields
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
}

export class PopFlixSubscriptionService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listCustomerSubscriptions(customerId: string) {
    const { data, error } = await this.supabase
      .from("popflix_subscriptions")
      .select(subscriptionSelect())
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao carregar assinaturas PopFlix");
    }

    return ((data ?? []) as unknown as PopFlixSubscriptionRow[]).map(mapSubscription);
  }

  async listAdminSubscriptions(filters: ListAdminPopFlixSubscriptionsFilters = {}) {
    let query = this.supabase
      .from("popflix_subscriptions")
      .select(subscriptionSelect())
      .order("created_at", { ascending: false })
      .limit(300);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.paymentStatus) {
      query = query.eq("payment_status", filters.paymentStatus);
    }

    if (filters.plan && POPFLIX_PLAN_SLUGS.includes(filters.plan as PopFlixPlanSlug)) {
      query = query.eq("plan", filters.plan);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar assinaturas PopFlix");
    }

    return filterMappedSubscriptions(
      ((data ?? []) as unknown as PopFlixSubscriptionRow[]).map(mapSubscription),
      filters,
    );
  }

  async createCustomerSubscription(
    customerId: string,
    input: CreatePopFlixSubscriptionInput,
  ) {
    const plan = getPopFlixPlanBySlug(input.plan);
    const { data: existing, error: existingError } = await this.supabase
      .from("popflix_subscriptions")
      .select("id,subscription_code,status")
      .eq("customer_id", customerId)
      .in("status", ["pending_payment", "active", "paused"])
      .limit(1);

    if (existingError) {
      throwQueryError(existingError, "Falha ao validar assinatura PopFlix existente");
    }

    if ((existing ?? []).length > 0) {
      throw conflict("Voce ja tem uma assinatura PopFlix em andamento.");
    }

    const { data, error } = await this.supabase
      .from("popflix_subscriptions")
      .insert({
        customer_id: customerId,
        favorite_franchises: input.favoriteFranchises?.trim() || null,
        monthly_price: plan.price,
        notes: input.notes?.trim() || null,
        payment_status: "pending",
        plan: plan.slug,
        status: "pending_payment",
        subscription_code: createSubscriptionCode(),
      })
      .select(subscriptionSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar assinatura PopFlix");
    }

    const created = mapSubscription(data as unknown as PopFlixSubscriptionRow);

    if (hasInfinitePayCheckoutEnv()) {
      try {
        const result = await this.generatePaymentLinkForSubscription(created.id, undefined);
        return result.subscription;
      } catch (paymentLinkError) {
        console.error("[PopFlix] automatic payment link generation failed", {
          error: paymentLinkError,
          subscriptionId: created.id,
        });
      }
    }

    return created;
  }

  async generatePaymentLinkForSubscription(
    subscriptionId: string,
    actorProfileId = this.actorId,
    baseUrl = env.siteUrl,
  ) {
    if (!hasInfinitePayCheckoutEnv()) {
      throw conflict("Configure INFINITEPAY_HANDLE antes de gerar link de pagamento");
    }

    const subscription = await this.getSubscriptionById(subscriptionId);

    if (["cancelled", "expired"].includes(subscription.status)) {
      throw conflict("Assinatura PopFlix encerrada nao recebe novo link");
    }

    const amountCents = moneyToCents(subscription.monthly_price);

    if (amountCents === null || amountCents <= 0) {
      throw conflict("Assinatura PopFlix com mensalidade invalida");
    }

    const result = await createInfinitePayCheckout({
      amountCents,
      customerEmail: subscription.customers?.email ?? null,
      customerName: subscription.customers?.name ?? "Cliente Smart Funkos",
      customerPhone: subscription.customers?.phone ?? null,
      debugOrderId: subscription.id,
      items: [
        {
          name: subscriptionPaymentDescription(subscription),
          quantity: 1,
          unitAmountCents: amountCents,
        },
      ],
      kind: "popflix",
      orderNumber: subscription.subscription_code,
      redirectUrl: `${baseUrl}/conta/popflix`,
      webhookUrl: `${baseUrl}/api/v1/webhooks/infinitepay`,
    });

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("popflix_subscriptions")
      .update({
        payment_link_created_at: now,
        payment_link_url: result.checkoutUrl,
        payment_provider: "infinitepay",
        payment_provider_reference: result.providerReference,
        payment_status: "pending",
        provider_payload: {
          request: result.requestPayload,
          response: result.raw,
        },
        status: subscription.status === "active" ? "active" : "pending_payment",
      })
      .eq("id", subscriptionId)
      .select(subscriptionSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao salvar link InfinitePay PopFlix");
    }

    await this.audit.createAdminActionLog({
      action: "popflix_subscription.payment_link_generated",
      adminId: actorProfileId ?? undefined,
      entityId: subscriptionId,
      entityType: "popflix_subscription",
      newValue: data,
      oldValue: subscription,
    });

    return {
      checkoutUrl: result.checkoutUrl,
      providerReference: result.providerReference,
      subscription: mapSubscription(data as unknown as PopFlixSubscriptionRow),
    };
  }

  async confirmSubscriptionPayment(
    subscriptionId: string,
    input: ConfirmPopFlixPaymentInput,
    actorProfileId = this.actorId,
  ) {
    const subscription = await this.getSubscriptionById(subscriptionId);

    if (["cancelled", "expired"].includes(subscription.status)) {
      throw conflict("Assinatura PopFlix encerrada nao recebe pagamento");
    }

    if (subscription.status === "active" && subscription.payment_status === "paid") {
      throw conflict("Assinatura PopFlix ja esta ativa e paga");
    }

    const paidAt = input.paidAt ?? new Date().toISOString();
    const { data: cashEntry, error: cashError } = await this.supabase
      .from("cash_entries")
      .insert({
        amount: Number(subscription.monthly_price),
        category: "subscription",
        created_by: actorProfileId ?? null,
        description: `PopFlix ${subscription.subscription_code} - Plano ${getPopFlixPlanBySlug(subscription.plan).name}`,
        occurred_at: paidAt,
        type: "income",
      })
      .select("id,type,category,amount,description,occurred_at,created_at")
      .single();

    if (cashError) {
      throwQueryError(cashError, "Falha ao registrar entrada de caixa PopFlix");
    }

    const { data, error } = await this.supabase
      .from("popflix_subscriptions")
      .update({
        capture_method: input.method,
        cash_entry_id: cashEntry.id,
        last_payment_at: paidAt,
        next_billing_at: addMonthsIso(paidAt, 1),
        paid_amount: Number(subscription.monthly_price),
        payment_status: "paid",
        provider_payment_method: input.method,
        started_at: subscription.started_at ?? paidAt,
        status: "active",
      })
      .eq("id", subscriptionId)
      .select(subscriptionSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao confirmar pagamento PopFlix");
    }

    await this.audit.createAdminActionLog({
      action: "popflix_subscription.payment_confirmed",
      adminId: actorProfileId ?? undefined,
      entityId: subscriptionId,
      entityType: "popflix_subscription",
      newValue: { cashEntry, notes: input.notes ?? null, subscription: data },
      oldValue: subscription,
    });

    return mapSubscription(data as unknown as PopFlixSubscriptionRow);
  }

  async syncSubscriptionPayment(
    subscriptionId: string,
    actorProfileId = this.actorId,
    options: { slug?: string | null; transactionNsu?: string | null } = {},
  ) {
    const subscription = await this.getSubscriptionById(subscriptionId);

    if (!subscription.payment_link_url) {
      throw conflict("Assinatura PopFlix ainda nao tem link InfinitePay");
    }

    if (subscription.status === "active" && subscription.payment_status === "paid") {
      return { paid: true, status: "ignored", reason: "Assinatura PopFlix ja paga" };
    }

    const check = await checkInfinitePayPaymentStatus({
      orderNumber: subscription.subscription_code,
      slug:
        options.slug ??
        (subscription.payment_provider_reference &&
        subscription.payment_provider_reference !== subscription.subscription_code
          ? subscription.payment_provider_reference
          : null),
      transactionNsu: options.transactionNsu ?? subscription.transaction_nsu ?? null,
    });
    const event = await this.createProviderEvent(check.normalized, check.raw, subscription.id);

    if (check.normalized.status === "paid") {
      const result = await this.applyPaidSubscriptionWebhook(
        subscription,
        check.normalized,
        event.id,
        check.raw,
      );
      await this.audit.createAdminActionLog({
        action: "popflix_subscription.payment_check_paid",
        adminId: actorProfileId ?? undefined,
        entityId: subscription.id,
        entityType: "popflix_subscription",
        newValue: result,
        oldValue: subscription,
      });
      return { ...result, paid: true };
    }

    await this.markProviderEvent(event.id, "ignored", "Pagamento PopFlix ainda nao confirmado");
    return {
      paid: false,
      status: "pending",
    };
  }

  async handleInfinitePayWebhook(payload: unknown) {
    const normalized = normalizeInfinitePayWebhook(payload);

    if (!normalized.eventId || !normalized.providerReference) {
      throw badRequest("Webhook InfinitePay sem referencia PopFlix");
    }

    const event = await this.createProviderEvent(normalized, payload);

    if (event.processing_status !== "pending") {
      return { status: "ignored", reason: "Evento ja recebido" };
    }

    const subscription = await this.findSubscriptionForWebhook(normalized);

    if (!subscription) {
      await this.markProviderEvent(event.id, "ignored", "Assinatura PopFlix nao encontrada");
      return { status: "ignored", reason: "Assinatura PopFlix nao encontrada" };
    }

    await this.supabase
      .from("payment_provider_events")
      .update({ popflix_subscription_id: subscription.id })
      .eq("id", event.id);

    if (normalized.status === "paid") {
      return this.applyPaidSubscriptionWebhook(subscription, normalized, event.id, payload);
    }

    if (["failed", "expired", "cancelled"].includes(normalized.status)) {
      await this.supabase
        .from("popflix_subscriptions")
        .update({
          payment_status: normalized.status,
          provider_payload: payload,
        })
        .eq("id", subscription.id)
        .not("status", "in", "(cancelled,expired)");
      await this.markProviderEvent(event.id, "processed");
      return { status: "processed", paymentStatus: normalized.status };
    }

    await this.markProviderEvent(event.id, "ignored", "Status nao mapeado");
    return { status: "ignored", reason: "Status nao mapeado" };
  }

  private async getSubscriptionById(subscriptionId: string) {
    const { data, error } = await this.supabase
      .from("popflix_subscriptions")
      .select(subscriptionSelect())
      .eq("id", subscriptionId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar assinatura PopFlix");
    }

    if (!data) {
      throw notFound("Assinatura PopFlix nao encontrada");
    }

    return data as unknown as PopFlixSubscriptionRow;
  }

  private async findSubscriptionForWebhook(normalized: NormalizedInfinitePayWebhook) {
    const references = [
      normalized.orderNumber,
      normalized.providerReference,
      normalized.invoiceSlug,
      normalized.transactionNsu,
    ].filter(Boolean) as string[];

    for (const reference of references) {
      const { data, error } = await this.supabase
        .from("popflix_subscriptions")
        .select(subscriptionSelect())
        .or(`subscription_code.eq.${reference},payment_provider_reference.eq.${reference},transaction_nsu.eq.${reference}`)
        .maybeSingle();

      if (error) {
        throwQueryError(error, "Falha ao localizar assinatura PopFlix do webhook");
      }

      if (data) {
        return data as unknown as PopFlixSubscriptionRow;
      }
    }

    return null;
  }

  private async createProviderEvent(
    normalized: NormalizedInfinitePayWebhook,
    payload: unknown,
    subscriptionId?: string,
  ) {
    const { data, error } = await this.supabase
      .from("payment_provider_events")
      .insert({
        event_id: normalized.eventId,
        event_type: normalized.eventType,
        payload,
        popflix_subscription_id: subscriptionId ?? null,
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
        throwQueryError(existingError, "Falha ao buscar evento InfinitePay PopFlix duplicado");
      }

      if (subscriptionId) {
        await this.supabase
          .from("payment_provider_events")
          .update({ popflix_subscription_id: subscriptionId })
          .eq("id", existing.id);
      }

      return {
        ...existing,
        processing_status: existing.processing_status === "pending" ? "ignored" : existing.processing_status,
      };
    }

    if (error) {
      throwQueryError(error, "Falha ao registrar evento InfinitePay PopFlix");
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
      throwQueryError(error, "Falha ao atualizar evento InfinitePay PopFlix");
    }
  }

  private async markSubscriptionPaymentManualReview(
    subscription: PopFlixSubscriptionRow,
    normalized: NormalizedInfinitePayWebhook,
    eventId: string,
    reason: string,
    payload: unknown,
  ) {
    const { error } = await this.supabase
      .from("popflix_subscriptions")
      .update({
        capture_method: mapCaptureMethod(normalized.captureMethod),
        paid_amount: centsToCurrency(normalized.paidAmountCents ?? normalized.amountCents),
        paid_installments: normalized.installments,
        payment_provider: "infinitepay",
        payment_provider_reference: normalized.invoiceSlug ?? normalized.providerReference,
        payment_status: "manual_review",
        provider_fee_amount: centsToCurrency(normalized.providerFeeAmountCents),
        provider_payload: payload,
        provider_payment_method: normalized.captureMethod,
        receipt_url: normalized.receiptUrl,
        transaction_nsu: normalized.transactionNsu,
      })
      .eq("id", subscription.id);

    if (error) {
      await this.markProviderEvent(eventId, "failed", error.message);
      throwQueryError(error, "Falha ao marcar pagamento PopFlix para revisao");
    }

    await this.markProviderEvent(eventId, "manual_review", reason);
    return { reason, status: "manual_review" };
  }

  private async applyPaidSubscriptionWebhook(
    subscription: PopFlixSubscriptionRow,
    normalized: NormalizedInfinitePayWebhook,
    eventId: string,
    payload: unknown,
  ) {
    if (subscription.status === "active" && subscription.payment_status === "paid") {
      await this.markProviderEvent(eventId, "ignored", "Assinatura PopFlix ja estava paga");
      return { status: "ignored", reason: "Assinatura PopFlix ja paga" };
    }

    if (["cancelled", "expired"].includes(subscription.status)) {
      return this.markSubscriptionPaymentManualReview(
        subscription,
        normalized,
        eventId,
        `Assinatura PopFlix esta ${subscription.status}; pagamento exige revisao manual`,
        payload,
      );
    }

    const expectedCents = moneyToCents(subscription.monthly_price);
    const receivedCents = normalized.paidAmountCents ?? normalized.amountCents;

    if (expectedCents === null || receivedCents === null) {
      return this.markSubscriptionPaymentManualReview(
        subscription,
        normalized,
        eventId,
        "Valor pago PopFlix nao informado",
        payload,
      );
    }

    if (receivedCents + 1 < expectedCents) {
      return this.markSubscriptionPaymentManualReview(
        subscription,
        normalized,
        eventId,
        "Valor pago menor que a mensalidade PopFlix",
        payload,
      );
    }

    const paidAt = new Date().toISOString();
    const paidAmount = centsToCurrency(receivedCents);
    const { data: cashEntry, error: cashError } = await this.supabase
      .from("cash_entries")
      .insert({
        amount: Number(subscription.monthly_price),
        category: "subscription",
        created_by: null,
        description: `Pagamento InfinitePay - PopFlix ${subscription.subscription_code}`,
        occurred_at: paidAt,
        type: "income",
      })
      .select("id,type,category,amount,description,occurred_at,created_at")
      .single();

    if (cashError) {
      await this.markProviderEvent(eventId, "failed", cashError.message);
      throwQueryError(cashError, "Falha ao registrar caixa PopFlix InfinitePay");
    }

    const { data, error } = await this.supabase
      .from("popflix_subscriptions")
      .update({
        capture_method: mapCaptureMethod(normalized.captureMethod),
        cash_entry_id: cashEntry.id,
        last_payment_at: paidAt,
        next_billing_at: addMonthsIso(paidAt, 1),
        paid_amount: paidAmount,
        paid_installments: normalized.installments,
        payment_provider: "infinitepay",
        payment_provider_reference: normalized.invoiceSlug ?? normalized.providerReference,
        payment_status: "paid",
        provider_fee_amount: centsToCurrency(normalized.providerFeeAmountCents),
        provider_payload: payload,
        provider_payment_method: normalized.captureMethod,
        receipt_url: normalized.receiptUrl,
        started_at: subscription.started_at ?? paidAt,
        status: "active",
        transaction_nsu: normalized.transactionNsu,
      })
      .eq("id", subscription.id)
      .select(subscriptionSelect())
      .single();

    if (error) {
      await this.markProviderEvent(eventId, "failed", error.message);
      throwQueryError(error, "Falha ao ativar assinatura PopFlix");
    }

    await this.audit.createAdminActionLog({
      action: "popflix_subscription.infinitepay_paid",
      adminId: undefined,
      entityId: subscription.id,
      entityType: "popflix_subscription",
      newValue: { cashEntry, subscription: data },
      oldValue: subscription,
    });
    await this.markProviderEvent(eventId, "processed");

    return {
      cashEntryId: cashEntry.id,
      status: "processed",
      subscription: mapSubscription(data as unknown as PopFlixSubscriptionRow),
      subscriptionId: subscription.id,
    };
  }
}
