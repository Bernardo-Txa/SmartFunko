import "server-only";
import { z } from "zod";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const manualCashEntrySchema = z.object({
  type: z.enum(["income", "expense", "adjustment"]),
  category: z.enum(["sale", "supplier_purchase", "shipping", "payment_fee", "refund", "manual_adjustment"]),
  amount: z.number(),
  description: z.string().trim().optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export type ManualCashEntryInput = z.infer<typeof manualCashEntrySchema>;

type PendingReceivableOrder = {
  id: string;
  order_number: string;
  total: number;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

export class CashflowService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listCashEntries() {
    const { data, error } = await this.supabase
      .from("cash_entries")
      .select("id,type,category,order_id,payment_id,amount,description,occurred_at,created_by,created_at,orders(order_number),payments(method,status)")
      .order("occurred_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar caixa");
    }

    return data ?? [];
  }

  async getCashflowSummary() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: entries, error: entriesError } = await this.supabase
      .from("cash_entries")
      .select("type,amount,occurred_at")
      .gte("occurred_at", startOfToday.toISOString());

    if (entriesError) {
      throwQueryError(entriesError, "Falha ao resumir caixa");
    }

    const incomeToday = (entries ?? [])
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const expenseToday = (entries ?? [])
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount), 0);

    const pending = await this.getPendingReceivables();

    return {
      expenseToday,
      incomeToday,
      netToday: incomeToday - expenseToday,
      pendingReceivables: pending.totalPending,
    };
  }

  async getPendingReceivables() {
    const { data: orders, error: ordersError } = await this.supabase
      .from("orders")
      .select("id,order_number,total,status,payments(amount,status)")
      .not("status", "in", "(cancelled,refunded)");

    if (ordersError) {
      throwQueryError(ordersError, "Falha ao listar recebiveis pendentes");
    }

    const items = ((orders ?? []) as PendingReceivableOrder[])
      .map((order) => {
        const paid = (order.payments ?? [])
          .filter((payment) => payment.status === "paid")
          .reduce((sum, payment) => sum + Number(payment.amount), 0);

        return {
          orderId: order.id,
          orderNumber: order.order_number,
          paidAmount: paid,
          pendingAmount: Math.max(0, Number(order.total) - paid),
          total: Number(order.total),
        };
      })
      .filter((order) => order.pendingAmount > 0);

    return {
      items,
      totalPending: items.reduce((sum, order) => sum + order.pendingAmount, 0),
    };
  }

  async createManualCashEntry(input: ManualCashEntryInput) {
    const { data, error } = await this.supabase
      .from("cash_entries")
      .insert({
        amount: input.amount,
        category: input.category,
        created_by: this.actorId ?? null,
        description: input.description ?? null,
        occurred_at: input.occurredAt ?? new Date().toISOString(),
        type: input.type,
      })
      .select("id,type,category,order_id,payment_id,amount,description,occurred_at,created_by,created_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar lancamento manual");
    }

    await this.audit.createAdminActionLog({
      action: "cashflow.manual_entry",
      adminId: this.actorId,
      entityId: data.id,
      entityType: "cash_entry",
      newValue: data,
    });

    return data;
  }
}
