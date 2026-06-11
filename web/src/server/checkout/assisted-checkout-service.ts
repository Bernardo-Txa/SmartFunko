import "server-only";
import { z } from "zod";
import { env, isAssistedCheckoutEnabled } from "@/lib/env";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { couponCodeSchema, DiscountCouponService } from "@/server/coupons/discount-coupon-service";
import { badRequest, conflict, forbidden, notFound } from "@/server/http/errors";
import { calculateOrderTotals } from "@/server/orders/order-calculator";
import {
  checkInfinitePayPaymentStatus,
  createInfinitePayCheckout,
  normalizeInfinitePayWebhook,
  type NormalizedInfinitePayWebhook,
} from "@/server/payments/infinitepay-client";
import { RewardsService } from "@/server/rewards/rewards-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const createCustomerOrderRequestSchema = z.object({
  couponCode: couponCodeSchema.optional().nullable(),
  items: z.array(z.object({
    quantity: z.number().int().positive(),
    variantId: z.string().uuid(),
  })).min(1, "Informe ao menos um item"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const rejectOrderSchema = z.object({
  reason: z.string().trim().min(3, "Informe o motivo da recusa").max(1000),
});

export type CreateCustomerOrderRequestInput = z.infer<typeof createCustomerOrderRequestSchema>;

type VariantRow = {
  id: string;
  sale_price: number | string;
  source: string;
  status: string;
  products?: {
    name?: string | null;
  } | null;
};

type AssistedOrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  review_status: string;
  status: string;
  total: number | string;
  payment_link_url: string | null;
  payment_provider_reference: string | null;
  public_token: string;
  customers?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  order_items?: Array<{
    quantity: number;
    unit_price: number | string;
    product_variants?: {
      products?: {
        name?: string | null;
      } | null;
    } | null;
  }>;
  payments?: Array<{
    amount: number | string;
    status: string;
  }>;
};

function createOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SF-${date}-${time}-${suffix}`;
}

function variantSourceToOrderSource(source: string) {
  if (source === "own_stock") {
    return "stock";
  }

  if (source === "international") {
    return "international_order";
  }

  if (source === "preorder") {
    return "preorder";
  }

  return "national_order";
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

function orderSelect() {
  return `
    id,order_number,customer_id,review_status,status,total,payment_link_url,payment_provider_reference,public_token,
    customers(name,email,phone),
    order_items(quantity,unit_price,product_variants(products(name))),
    payments(amount,status)
  `;
}

export class AssistedCheckoutService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async createCustomerOrderRequest(customerId: string, input: CreateCustomerOrderRequestInput, actorProfileId?: string) {
    if (!isAssistedCheckoutEnabled()) {
      throw forbidden("Checkout assistido desabilitado");
    }

    const variantIds = Array.from(new Set(input.items.map((item) => item.variantId)));
    const { data: variants, error: variantsError } = await this.supabase
      .from("product_variants")
      .select("id,sale_price,source,status,products(name)")
      .in("id", variantIds);

    if (variantsError) {
      throwQueryError(variantsError, "Falha ao validar produtos do carrinho");
    }

    const variantById = new Map((variants as unknown as VariantRow[]).map((variant) => [variant.id, variant]));

    for (const item of input.items) {
      const variant = variantById.get(item.variantId);

      if (!variant) {
        throw badRequest("Produto do carrinho nao encontrado");
      }

      if (variant.status === "hidden" || variant.status === "sold_out") {
        throw conflict(`Produto indisponivel: ${variant.products?.name ?? item.variantId}`);
      }
    }

    const items = input.items.map((item) => {
      const variant = variantById.get(item.variantId) as VariantRow;
      const unitPrice = Number(variant.sale_price);

      return {
        productVariantId: item.variantId,
        quantity: item.quantity,
        source: variantSourceToOrderSource(variant.source),
        status: "requested",
        totalPrice: unitPrice * item.quantity,
        unitPrice,
      };
    });
    const subtotalTotals = calculateOrderTotals({
      discount: 0,
      items: items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
      shippingAmount: 0,
    });
    const couponService = new DiscountCouponService(this.supabase, actorProfileId ?? this.actorId);
    const coupon = input.couponCode
      ? await couponService.validateCoupon(input.couponCode, subtotalTotals.subtotal)
      : null;
    const totals = calculateOrderTotals({
      discount: coupon?.discount ?? 0,
      items: items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
      shippingAmount: 0,
    });

    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .insert({
        channel: "website",
        created_by: actorProfileId ?? this.actorId ?? null,
        coupon_code: coupon?.code ?? null,
        coupon_id: coupon?.couponId ?? null,
        customer_id: customerId,
        discount: totals.discount,
        notes: input.notes ?? null,
        order_number: createOrderNumber(),
        review_status: "under_review",
        status: "draft",
        subtotal: totals.subtotal,
        total: totals.total,
      })
      .select("id,order_number,customer_id,review_status,status,total")
      .single();

    if (orderError) {
      throwQueryError(orderError, "Falha ao criar pedido em analise");
    }

    const { error: itemsError } = await this.supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        product_variant_id: item.productVariantId,
        quantity: item.quantity,
        source: item.source,
        status: item.status,
        total_price: item.totalPrice,
        unit_price: item.unitPrice,
      })),
    );

    if (itemsError) {
      throwQueryError(itemsError, "Falha ao criar itens do pedido em analise");
    }

    if (coupon) {
      await couponService.incrementUsage(coupon.couponId);
    }

    await this.addOrderHistory(
      order.id,
      null,
      "under_review",
      coupon
        ? `Pedido enviado pelo cliente para analise com cupom ${coupon.code}`
        : "Pedido enviado pelo cliente para analise",
      actorProfileId,
    );
    await this.audit.createAdminActionLog({
      action: "checkout.request_created",
      adminId: actorProfileId ?? this.actorId,
      entityId: order.id,
      entityType: "order",
      newValue: order,
    });

    return {
      message: "Seu pedido foi enviado para análise. A Smart Funkos vai aprovar ou informar o motivo da recusa.",
      orderNumber: order.order_number,
      reviewStatus: order.review_status,
      status: order.status,
    };
  }

  async approveOrderForPayment(orderId: string, actorProfileId: string, baseUrl?: string) {
    const order = await this.getAssistedOrder(orderId);

    if (order.review_status !== "under_review" && order.review_status !== "awaiting_payment") {
      throw conflict("Somente pedido em analise ou aguardando pagamento pode gerar link");
    }

    return this.generatePaymentLinkForOrder(orderId, actorProfileId, "Pedido aprovado e link InfinitePay gerado", baseUrl);
  }

  async rejectOrder(orderId: string, reason: string, actorProfileId: string) {
    const order = await this.getAssistedOrder(orderId);

    if (order.status === "paid" || order.review_status === "paid") {
      throw conflict("Pedido pago nao pode ser recusado");
    }

    const { data, error } = await this.supabase
      .from("orders")
      .update({
        rejected_reason: reason,
        review_status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorProfileId,
      })
      .eq("id", orderId)
      .select(orderSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao recusar pedido");
    }

    await this.addOrderHistory(orderId, order.review_status, "rejected", `Pedido recusado: ${reason}`, actorProfileId);
    await this.audit.createAdminActionLog({
      action: "checkout.reject",
      adminId: actorProfileId,
      entityId: orderId,
      entityType: "order",
      newValue: data,
      oldValue: order,
    });

    return data;
  }

  async generatePaymentLinkForOrder(
    orderId: string,
    actorProfileId: string,
    historyNote = "Link InfinitePay regerado",
    baseUrl = env.siteUrl,
  ) {
    const order = await this.getAssistedOrder(orderId);

    if (order.status === "paid" || order.review_status === "paid") {
      throw conflict("Pedido pago nao precisa de novo link");
    }

    if (Number(order.total) <= 0 || !order.order_items?.length) {
      throw conflict("Pedido precisa ter itens e total maior que zero");
    }

    const result = await createInfinitePayCheckout({
      amountCents: Math.round(Number(order.total) * 100),
      customerEmail: order.customers?.email ?? null,
      customerName: order.customers?.name ?? "Cliente Smart Funkos",
      customerPhone: order.customers?.phone ?? null,
      items: order.order_items.map((item) => ({
        name: item.product_variants?.products?.name ?? "Produto Smart Funkos",
        quantity: item.quantity,
        unitAmountCents: Math.round(Number(item.unit_price) * 100),
      })),
      orderNumber: order.order_number,
      redirectUrl: `${baseUrl}/pedido/${order.order_number}?token=${order.public_token}`,
      webhookUrl: `${baseUrl}/api/v1/webhooks/infinitepay`,
    });

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("orders")
      .update({
        payment_link_created_at: now,
        payment_link_url: result.checkoutUrl,
        payment_provider: "infinitepay",
        payment_provider_reference: result.providerReference,
        review_notes: null,
        review_status: "awaiting_payment",
        reviewed_at: now,
        reviewed_by: actorProfileId,
        status: "pending_payment",
      })
      .eq("id", orderId)
      .select(orderSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao salvar link InfinitePay");
    }

    await this.addOrderHistory(orderId, order.review_status, "awaiting_payment", historyNote, actorProfileId);
    await this.audit.createAdminActionLog({
      action: "checkout.payment_link_generated",
      adminId: actorProfileId,
      entityId: orderId,
      entityType: "order",
      newValue: data,
      oldValue: order,
    });

    return {
      checkoutUrl: result.checkoutUrl,
      order: data,
      providerReference: result.providerReference,
    };
  }

  async handleInfinitePayWebhook(payload: unknown) {
    const normalized = normalizeInfinitePayWebhook(payload);

    if (!normalized.eventId || !normalized.providerReference) {
      throw badRequest("Webhook InfinitePay sem referencia de pedido");
    }

    const event = await this.createProviderEvent(normalized, payload);

    if (event.processing_status !== "pending") {
      return { status: "ignored", reason: "Evento ja recebido" };
    }

    const order = await this.findOrderForWebhook(normalized);

    if (!order) {
      await this.markProviderEvent(event.id, "ignored", "Pedido nao encontrado");
      return { status: "ignored", reason: "Pedido nao encontrado" };
    }

    await this.supabase
      .from("payment_provider_events")
      .update({ order_id: order.id })
      .eq("id", event.id);

    if (normalized.status === "paid") {
      return this.applyPaidWebhook(order, normalized, event.id);
    }

    if (["failed", "expired", "cancelled"].includes(normalized.status)) {
      await this.supabase
        .from("orders")
        .update({
          review_notes: `Pagamento InfinitePay ${normalized.status}`,
        })
        .eq("id", order.id);
      await this.addOrderHistory(
        order.id,
        order.review_status,
        order.review_status,
        `Webhook InfinitePay: pagamento ${normalized.status}`,
        null,
      );
      await this.markProviderEvent(event.id, "processed");
      return { status: "processed", paymentStatus: normalized.status };
    }

    await this.markProviderEvent(event.id, "ignored", "Status nao mapeado");
    return { status: "ignored", reason: "Status nao mapeado" };
  }

  async checkInfinitePayPaymentForOrder(
    orderId: string,
    actorProfileId: string | null,
    options: { slug?: string | null; transactionNsu?: string | null } = {},
  ) {
    const order = await this.getAssistedOrder(orderId);

    if (!order.payment_link_url) {
      throw conflict("Pedido ainda nao tem link InfinitePay");
    }

    if (order.status === "paid" || order.review_status === "paid") {
      return { paid: true, status: "ignored", reason: "Pedido ja pago" };
    }

    const check = await checkInfinitePayPaymentStatus({
      orderNumber: order.order_number,
      slug:
        options.slug ??
        (order.payment_provider_reference && order.payment_provider_reference !== order.order_number
          ? order.payment_provider_reference
          : null),
      transactionNsu: options.transactionNsu ?? null,
    });
    const event = await this.createProviderEvent(check.normalized, check.raw);

    await this.supabase
      .from("payment_provider_events")
      .update({ order_id: order.id })
      .eq("id", event.id);

    if (check.normalized.status === "paid") {
      const result = await this.applyPaidWebhook(order, check.normalized, event.id);
      await this.audit.createAdminActionLog({
        action: "checkout.payment_check_paid",
        adminId: actorProfileId ?? undefined,
        entityId: order.id,
        entityType: "order",
        newValue: result,
        oldValue: order,
      });
      return { ...result, paid: true };
    }

    await this.supabase
      .from("orders")
      .update({ review_notes: "Consulta InfinitePay: pagamento ainda nao confirmado" })
      .eq("id", order.id);
    await this.addOrderHistory(
      order.id,
      order.review_status,
      order.review_status,
      "Consulta InfinitePay: pagamento ainda nao confirmado",
      actorProfileId,
    );
    await this.markProviderEvent(event.id, "ignored", "Pagamento ainda nao confirmado");

    return {
      paid: false,
      status: "pending",
    };
  }

  async checkInfinitePayPaymentForPublicOrder(
    orderNumber: string,
    token: string,
    options: { slug?: string | null; transactionNsu?: string | null } = {},
  ) {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber)
      .eq("public_token", token)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao validar link publico para consulta InfinitePay");
    }

    if (!data) {
      throw notFound("Pedido nao encontrado");
    }

    return this.checkInfinitePayPaymentForOrder(data.id, null, options);
  }

  private async applyPaidWebhook(order: AssistedOrderRow, normalized: NormalizedInfinitePayWebhook, eventId: string) {
    if (order.status === "paid" || order.review_status === "paid") {
      await this.markProviderEvent(eventId, "ignored", "Pedido ja estava pago");
      return { status: "ignored", reason: "Pedido ja pago" };
    }

    const paidAmount = (order.payments ?? [])
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const pendingAmount = Math.max(0, Number(order.total) - paidAmount);
    const receivedCents = normalized.paidAmountCents ?? normalized.amountCents;

    if (receivedCents === null) {
      await this.markProviderEvent(eventId, "manual_review", "Valor pago nao informado");
      return { status: "manual_review", reason: "Valor pago nao informado" };
    }

    const webhookAmount = centsToCurrency(receivedCents);

    if (webhookAmount === null || webhookAmount + 0.01 < pendingAmount) {
      await this.markProviderEvent(eventId, "manual_review", "Valor pago menor que o saldo pendente");
      return { status: "manual_review", reason: "Valor pago menor que o saldo pendente" };
    }

    const amount = pendingAmount;

    if (amount <= 0) {
      await this.markProviderEvent(eventId, "ignored", "Pedido sem saldo pendente");
      return { status: "ignored", reason: "Sem saldo pendente" };
    }

    const { data: paymentResult, error } = await this.supabase.rpc("record_manual_payment", {
      p_amount: amount,
      p_created_by: null,
      p_customer_id: order.customer_id,
      p_fee_amount: 0,
      p_method: mapCaptureMethod(normalized.captureMethod),
      p_notes: "Pagamento confirmado por webhook InfinitePay",
      p_order_id: order.id,
      p_paid_at: new Date().toISOString(),
    });

    if (error) {
      await this.markProviderEvent(eventId, "failed", error.message);
      throwQueryError(error, "Falha ao registrar pagamento InfinitePay");
    }

    const paymentId =
      paymentResult && typeof paymentResult === "object" && "payment_id" in paymentResult
        ? String(paymentResult.payment_id)
        : null;

    await this.supabase
      .from("orders")
      .update({
        payment_provider_reference: normalized.transactionNsu ?? normalized.providerReference,
        review_status: "paid",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    await this.addOrderHistory(order.id, order.review_status, "paid", "Pagamento confirmado pela InfinitePay", null);
    await this.markProviderEvent(eventId, "processed", undefined, paymentId);
    await this.safeAwardPaymentPoints(paymentId);

    return {
      orderId: order.id,
      paymentId,
      status: "processed",
    };
  }

  private async getAssistedOrder(orderId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(orderSelect())
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido do checkout assistido");
    }

    if (!data) {
      throw notFound("Pedido nao encontrado");
    }

    return data as unknown as AssistedOrderRow;
  }

  private async findOrderForWebhook(normalized: NormalizedInfinitePayWebhook) {
    const references = [
      normalized.orderNumber,
      normalized.providerReference,
      normalized.invoiceSlug,
      normalized.transactionNsu,
    ].filter(Boolean) as string[];

    for (const reference of references) {
      const { data, error } = await this.supabase
        .from("orders")
        .select(orderSelect())
        .or(`order_number.eq.${reference},payment_provider_reference.eq.${reference}`)
        .maybeSingle();

      if (error) {
        throwQueryError(error, "Falha ao localizar pedido do webhook");
      }

      if (data) {
        return data as unknown as AssistedOrderRow;
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
      throwQueryError(error, "Falha ao registrar evento InfinitePay");
    }

    return data;
  }

  private async markProviderEvent(
    eventId: string,
    status: "processed" | "ignored" | "failed" | "manual_review",
    errorMessage?: string,
    paymentId?: string | null,
  ) {
    const { error } = await this.supabase
      .from("payment_provider_events")
      .update({
        error_message: errorMessage ?? null,
        payment_id: paymentId ?? null,
        processed_at: new Date().toISOString(),
        processing_status: status,
      })
      .eq("id", eventId);

    if (error) {
      throwQueryError(error, "Falha ao atualizar evento InfinitePay");
    }
  }

  private async addOrderHistory(
    orderId: string,
    previousStatus: string | null,
    newStatus: string,
    notes: string,
    changedBy: string | null | undefined,
  ) {
    const { error } = await this.supabase.from("order_status_history").insert({
      changed_by: changedBy ?? null,
      new_status: newStatus,
      notes,
      order_id: orderId,
      previous_status: previousStatus,
    });

    if (error) {
      throwQueryError(error, "Falha ao registrar historico do checkout assistido");
    }
  }

  private async safeAwardPaymentPoints(paymentId: string | null) {
    if (!paymentId) {
      return;
    }

    try {
      await new RewardsService(this.supabase, null).awardPaymentPoints(paymentId);
    } catch (error) {
      console.error("Falha ao registrar pontos do pagamento InfinitePay", error);
    }
  }
}
