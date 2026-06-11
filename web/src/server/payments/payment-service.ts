import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { RewardsService } from "@/server/rewards/rewards-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const manualPaymentSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  method: z.enum(["pix", "credit_card", "debit_card", "cash", "manual", "infinitepay"]).default("manual"),
  amount: z.number().positive(),
  feeAmount: z.number().nonnegative().default(0),
  paidAt: z.string().datetime().optional(),
  notes: z.string().trim().optional().nullable(),
});

export const refundManualPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  notes: z.string().trim().min(3, "Informe uma justificativa para o estorno"),
});

export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;
export type RefundManualPaymentInput = z.infer<typeof refundManualPaymentSchema>;

export type PaymentListFilters = {
  endDate?: string;
  limit?: number;
  method?: string;
  search?: string;
  startDate?: string;
  status?: string;
};

type PaymentRpcResult = {
  cash_entry_id: string;
  new_status: string;
  order_id: string;
  paid_amount: number;
  payment_id: string;
  pending_amount: number;
  previous_status: string;
};

type RefundRpcResult = {
  cash_entry_id: string;
  new_status: string;
  order_id: string;
  paid_amount: number;
  payment_id: string;
  pending_amount: number;
  previous_status: string;
  refund_cash_entry_id: string;
  refunded_amount: number;
};

type PaymentSummaryRow = {
  amount: number | string;
  fee_amount: number | string;
  net_amount: number | string;
  paid_at: string | null;
  status: string;
};

type PendingReceivableOrder = {
  id: string;
  total: number | string;
  status: string;
  payments?: Array<{
    amount: number | string;
    status: string;
  }>;
};

function paymentSelect() {
  return `
    id,order_id,customer_id,method,amount,fee_amount,net_amount,status,paid_at,created_by,created_at,
    orders(id,order_number,total,status),
    customers(id,name,email,phone),
    profiles(name,email)
  `;
}

function escapeSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").trim();
}

function inDateRange(value: string | null, filters: PaymentListFilters) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  if (filters.startDate && time < new Date(filters.startDate).getTime()) {
    return false;
  }

  if (filters.endDate && time > new Date(filters.endDate).getTime()) {
    return false;
  }

  return true;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function throwFriendlyPaymentRpcError(error: Parameters<typeof throwQueryError>[0]): never {
  const message = error?.message ?? "";
  const normalized = message.toLowerCase();

  if (normalized.includes("maior que o saldo pendente")) {
    throw conflict("Pagamento maior que o saldo pendente");
  }

  if (normalized.includes("maior que zero")) {
    throw badRequest("Valor do pagamento deve ser maior que zero");
  }

  if (normalized.includes("taxa") && normalized.includes("maior")) {
    throw badRequest("Taxa do pagamento nao pode ser maior que o valor bruto");
  }

  if (normalized.includes("cliente informado")) {
    throw conflict("Cliente informado nao pertence ao pedido");
  }

  if (normalized.includes("nao recebe pagamento")) {
    throw conflict("Pedido com este status nao recebe pagamento");
  }

  throwQueryError(error, "Falha ao registrar pagamento manual");
}

function throwFriendlyRefundRpcError(error: Parameters<typeof throwQueryError>[0]): never {
  const message = error?.message ?? "";
  const normalized = message.toLowerCase();

  if (normalized.includes("justificativa")) {
    throw badRequest("Justificativa do estorno e obrigatoria");
  }

  if (normalized.includes("somente pagamento pago")) {
    throw conflict("Somente pagamento pago pode ser estornado");
  }

  if (normalized.includes("maior que o pagamento")) {
    throw conflict("Valor de estorno maior que o pagamento");
  }

  if (normalized.includes("parcial")) {
    throw conflict("Estorno parcial ainda nao esta disponivel");
  }

  if (normalized.includes("maior que zero")) {
    throw badRequest("Valor de estorno deve ser maior que zero");
  }

  throwQueryError(error, "Falha ao estornar pagamento");
}

export class PaymentService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {}

  async listPayments(filters: PaymentListFilters = {}) {
    const limit = Math.min(500, Math.max(1, Number(filters.limit ?? 300)));
    let query = this.supabase
      .from("payments")
      .select(paymentSelect())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.method) {
      query = query.eq("method", filters.method);
    }

    if (filters.startDate) {
      query = query.gte("paid_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("paid_at", filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar pagamentos");
    }

    const search = filters.search?.trim().toLowerCase();

    if (!search) {
      return data ?? [];
    }

    return (data ?? []).filter((payment) => {
      const row = payment as {
        id?: string | null;
        customers?: { name?: string | null; email?: string | null } | null;
        orders?: { order_number?: string | null } | null;
      };
      return [
        row.id ?? "",
        row.orders?.order_number ?? "",
        row.customers?.name ?? "",
        row.customers?.email ?? "",
      ].some((value) => value.toLowerCase().includes(escapeSearch(search)));
    });
  }

  async getPaymentSummary(filters: PaymentListFilters = {}) {
    const [periodPayments, todayPayments, monthPayments, pendingReceivables] = await Promise.all([
      this.listPaymentSummaryRows(filters),
      this.listPaymentSummaryRows({
        startDate: startOfToday().toISOString(),
        status: "paid",
      }),
      this.listPaymentSummaryRows({
        startDate: startOfMonth().toISOString(),
        status: "paid",
      }),
      this.calculatePendingReceivables(),
    ]);

    const paidPeriod = periodPayments.filter((payment) => payment.status === "paid");

    return {
      feesInPeriod: paidPeriod.reduce((sum, payment) => sum + Number(payment.fee_amount), 0),
      netInPeriod: paidPeriod.reduce((sum, payment) => sum + Number(payment.net_amount), 0),
      pendingReceivables,
      receivedInPeriod: paidPeriod.reduce((sum, payment) => sum + Number(payment.amount), 0),
      receivedThisMonth: monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      receivedToday: todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    };
  }

  async calculateOrderPaidAmount(orderId: string) {
    const { data, error } = await this.supabase
      .from("payments")
      .select("amount")
      .eq("order_id", orderId)
      .eq("status", "paid");

    if (error) {
      throwQueryError(error, "Falha ao calcular pagamentos do pedido");
    }

    return (data ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  }

  async calculateOrderPendingAmount(orderId: string) {
    const order = await this.getOrderPaymentBase(orderId);
    const paidAmount = await this.calculateOrderPaidAmount(orderId);
    return Math.max(0, Number(order.total) - paidAmount);
  }

  async recordManualPayment(input: ManualPaymentInput) {
    const order = await this.getOrderPaymentBase(input.orderId);
    const paidAmount = await this.calculateOrderPaidAmount(input.orderId);
    const pendingAmount = Math.max(0, Number(order.total) - paidAmount);

    if (input.customerId && input.customerId !== order.customer_id) {
      throw conflict("Cliente informado nao pertence ao pedido");
    }

    if (input.amount > pendingAmount + 0.001) {
      throw conflict("Pagamento maior que o saldo pendente");
    }

    if (input.feeAmount > input.amount) {
      throw badRequest("Taxa do pagamento nao pode ser maior que o valor bruto");
    }

    const { data, error } = await this.supabase.rpc("record_manual_payment", {
      p_amount: input.amount,
      p_created_by: this.actorId ?? null,
      p_customer_id: input.customerId ?? null,
      p_fee_amount: input.feeAmount,
      p_method: input.method,
      p_notes: input.notes ?? null,
      p_order_id: input.orderId,
      p_paid_at: input.paidAt ?? new Date().toISOString(),
    });

    if (error) {
      throwFriendlyPaymentRpcError(error);
    }

    const result = data as PaymentRpcResult;
    await this.safeAwardPaymentPoints(result.payment_id);

    return result;
  }

  async refundManualPayment(paymentId: string, input: RefundManualPaymentInput) {
    const { data, error } = await this.supabase.rpc("refund_manual_payment", {
      p_amount: input.amount ?? null,
      p_created_by: this.actorId ?? null,
      p_notes: input.notes,
      p_payment_id: paymentId,
    });

    if (error) {
      throwFriendlyRefundRpcError(error);
    }

    const result = data as RefundRpcResult;
    await this.safeReversePaymentPoints(result.payment_id, result.refunded_amount);

    return result;
  }

  async refundPayment(paymentId: string, input: RefundManualPaymentInput) {
    return this.refundManualPayment(paymentId, input);
  }

  private async listPaymentSummaryRows(filters: PaymentListFilters = {}) {
    let query = this.supabase
      .from("payments")
      .select("amount,fee_amount,net_amount,status,paid_at")
      .order("paid_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.method) {
      query = query.eq("method", filters.method);
    }

    if (filters.startDate) {
      query = query.gte("paid_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("paid_at", filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao resumir pagamentos");
    }

    return ((data ?? []) as unknown as PaymentSummaryRow[]).filter((payment) => inDateRange(payment.paid_at, filters));
  }

  private async calculatePendingReceivables() {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,total,status,payments(amount,status)")
      .not("status", "in", "(cancelled,refunded)");

    if (error) {
      throwQueryError(error, "Falha ao calcular valores pendentes");
    }

    return ((data ?? []) as unknown as PendingReceivableOrder[]).reduce((sum, order) => {
      const paidAmount = (order.payments ?? [])
        .filter((payment) => payment.status === "paid")
        .reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);

      return sum + Math.max(0, Number(order.total) - paidAmount);
    }, 0);
  }

  private async getOrderPaymentBase(orderId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,order_number,customer_id,total,status")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido para pagamento");
    }

    if (!data) {
      throw notFound("Pedido nao encontrado");
    }

    if (data.status === "cancelled" || data.status === "refunded") {
      throw conflict("Pedido com este status nao recebe pagamento");
    }

    return data;
  }

  private async safeAwardPaymentPoints(paymentId: string) {
    try {
      await new RewardsService(this.supabase, this.actorId).awardPaymentPoints(paymentId);
    } catch (error) {
      console.error("Falha ao registrar pontos do pagamento", error);
    }
  }

  private async safeReversePaymentPoints(paymentId: string, refundedAmount?: number | null) {
    try {
      await new RewardsService(this.supabase, this.actorId).reversePaymentPoints(paymentId, refundedAmount);
    } catch (error) {
      console.error("Falha ao reverter pontos do pagamento", error);
    }
  }
}
