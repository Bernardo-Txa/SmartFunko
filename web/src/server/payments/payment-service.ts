import "server-only";
import { z } from "zod";
import { conflict, notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { calculatePaymentStatus } from "@/server/orders/order-calculator";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const manualPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["pix", "credit_card", "debit_card", "cash", "manual"]).default("manual"),
  amount: z.number().positive(),
  feeAmount: z.number().nonnegative().default(0),
  paidAt: z.string().datetime().optional(),
  allowOverpayment: z.boolean().default(false),
});

export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;

export class PaymentService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listPayments() {
    const { data, error } = await this.supabase
      .from("payments")
      .select(
        "id,order_id,customer_id,method,amount,fee_amount,net_amount,status,paid_at,created_by,created_at,orders(order_number,total,status),customers(name,email,phone)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar pagamentos");
    }

    return data ?? [];
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
    const paidBefore = await this.calculateOrderPaidAmount(input.orderId);
    const pendingBefore = Math.max(0, Number(order.total) - paidBefore);

    if (!input.allowOverpayment && input.amount > pendingBefore + 0.001) {
      throw conflict("Pagamento maior que o saldo pendente");
    }

    const netAmount = Math.max(0, input.amount - input.feeAmount);
    const paidAt = input.paidAt ?? new Date().toISOString();

    const { data: payment, error: paymentError } = await this.supabase
      .from("payments")
      .insert({
        amount: input.amount,
        created_by: this.actorId ?? null,
        customer_id: order.customer_id,
        fee_amount: input.feeAmount,
        method: input.method,
        net_amount: netAmount,
        order_id: input.orderId,
        paid_at: paidAt,
        status: "paid",
      })
      .select("id,order_id,customer_id,method,amount,fee_amount,net_amount,status,paid_at,created_by,created_at")
      .single();

    if (paymentError) {
      throwQueryError(paymentError, "Falha ao registrar pagamento");
    }

    const { data: cashEntry, error: cashError } = await this.supabase
      .from("cash_entries")
      .insert({
        amount: netAmount,
        category: "sale",
        created_by: this.actorId ?? null,
        description: `Recebimento do pedido ${order.order_number}`,
        occurred_at: paidAt,
        order_id: input.orderId,
        payment_id: payment.id,
        type: "income",
      })
      .select("id,type,category,order_id,payment_id,amount,description,occurred_at,created_by,created_at")
      .single();

    if (cashError) {
      throwQueryError(cashError, "Falha ao criar entrada de caixa");
    }

    const paidAfter = paidBefore + input.amount;
    const nextStatus = calculatePaymentStatus(Number(order.total), paidAfter);
    await this.updateOrderPaymentStatus(input.orderId, nextStatus, order.status);

    await this.audit.createAdminActionLog({
      action: "payment.record_manual",
      adminId: this.actorId,
      entityId: payment.id,
      entityType: "payment",
      newValue: {
        cashEntry,
        payment,
      },
      oldValue: {
        orderStatus: order.status,
        paidBefore,
        pendingBefore,
      },
    });

    return {
      cashEntry,
      payment,
      paidAmount: paidAfter,
      pendingAmount: Math.max(0, Number(order.total) - paidAfter),
      status: nextStatus,
    };
  }

  async updateOrderPaymentStatus(orderId: string, status: "pending_payment" | "partially_paid" | "paid", previousStatus?: string) {
    const { error } = await this.supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      throwQueryError(error, "Falha ao atualizar status financeiro do pedido");
    }

    if (previousStatus !== status) {
      const { error: historyError } = await this.supabase.from("order_status_history").insert({
        changed_by: this.actorId ?? null,
        new_status: status,
        notes: "Status atualizado por pagamento manual",
        order_id: orderId,
        previous_status: previousStatus ?? null,
      });

      if (historyError) {
        throwQueryError(historyError, "Falha ao registrar historico financeiro");
      }
    }
  }

  async refundPayment() {
    // TODO: implementar estorno com regra financeira completa na proxima sprint.
    throw conflict("Estorno ainda nao implementado na V1");
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

    if (data.status === "cancelled") {
      throw conflict("Pedido cancelado nao recebe pagamento");
    }

    return data;
  }
}
