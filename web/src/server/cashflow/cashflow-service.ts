import "server-only";
import { z } from "zod";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const cashEntryTypeSchema = z.enum(["income", "expense", "adjustment"]);
export const cashEntryCategorySchema = z.enum([
  "sale",
  "supplier_purchase",
  "shipping",
  "payment_fee",
  "refund",
  "manual_adjustment",
]);

export const manualCashEntrySchema = z.object({
  type: cashEntryTypeSchema,
  category: cashEntryCategorySchema,
  amount: z.number().positive(),
  description: z.string().trim().min(3, "Informe uma descricao para o lancamento"),
  occurredAt: z.string().datetime().optional(),
});

export type ManualCashEntryInput = z.infer<typeof manualCashEntrySchema>;

export type CashEntryFilters = {
  category?: string;
  endDate?: string;
  limit?: number;
  order?: string;
  search?: string;
  startDate?: string;
  type?: string;
};

type PendingReceivableOrder = {
  id: string;
  order_number: string;
  total: number;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

type CashEntrySummaryRow = {
  amount: number | string;
  category: string;
  occurred_at: string;
  type: string;
};

function cashEntrySelect() {
  return `
    id,type,category,order_id,payment_id,amount,description,occurred_at,created_by,created_at,
    orders(id,order_number),
    payments(id,method,status),
    profiles(name,email)
  `;
}

function escapeSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").trim();
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

export class CashflowService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listCashEntries(filters: CashEntryFilters = {}) {
    const limit = Math.min(500, Math.max(1, Number(filters.limit ?? 300)));
    let query = this.supabase
      .from("cash_entries")
      .select(cashEntrySelect())
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.startDate) {
      query = query.gte("occurred_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("occurred_at", filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar caixa");
    }

    const search = filters.search?.trim().toLowerCase();
    const orderSearch = filters.order?.trim().toLowerCase();

    return (data ?? []).filter((entry) => {
      const row = entry as {
        description?: string | null;
        orders?: { order_number?: string | null } | null;
        payments?: { id?: string | null } | null;
      };

      if (orderSearch && !(row.orders?.order_number ?? "").toLowerCase().includes(escapeSearch(orderSearch))) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        row.description ?? "",
        row.orders?.order_number ?? "",
        row.payments?.id ?? "",
      ].some((value) => value.toLowerCase().includes(escapeSearch(search)));
    });
  }

  async getCashflowSummary(filters: CashEntryFilters = {}) {
    const [periodEntries, todayEntries, monthEntries, pending] = await Promise.all([
      this.listCashEntrySummaryRows(filters),
      this.listCashEntrySummaryRows({ startDate: startOfToday().toISOString() }),
      this.listCashEntrySummaryRows({ startDate: startOfMonth().toISOString() }),
      this.getPendingReceivables(),
    ]);

    const summarize = (entries: CashEntrySummaryRow[]) => {
      const income = entries
        .filter((entry) => entry.type === "income")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const expense = entries
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const adjustment = entries
        .filter((entry) => entry.type === "adjustment")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      return {
        adjustment,
        expense,
        income,
        net: income - expense + adjustment,
      };
    };

    const period = summarize(periodEntries);
    const today = summarize(todayEntries);
    const month = summarize(monthEntries);

    return {
      adjustmentsInPeriod: period.adjustment,
      expenseInPeriod: period.expense,
      expenseToday: today.expense,
      incomeInPeriod: period.income,
      incomeThisMonth: month.income,
      incomeToday: today.income,
      manualAdjustments: periodEntries
        .filter((entry) => entry.category === "manual_adjustment")
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
      netInPeriod: period.net,
      netToday: today.net,
      paymentFees: periodEntries
        .filter((entry) => entry.category === "payment_fee")
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
      pendingReceivables: pending.totalPending,
      refunds: periodEntries
        .filter((entry) => entry.category === "refund")
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
    };
  }

  async getCashflowByCategory(filters: CashEntryFilters = {}) {
    const entries = await this.listCashEntrySummaryRows(filters);
    const totals = new Map<string, number>();

    for (const entry of entries) {
      totals.set(entry.category, (totals.get(entry.category) ?? 0) + Number(entry.amount));
    }

    return Array.from(totals.entries())
      .map(([category, amount]) => ({ amount, category }))
      .sort((first, second) => second.amount - first.amount);
  }

  async getPendingReceivables() {
    const { data: orders, error: ordersError } = await this.supabase
      .from("orders")
      .select("id,order_number,total,status,payments(amount,status)")
      .not("status", "in", "(cancelled,refunded)");

    if (ordersError) {
      throwQueryError(ordersError, "Falha ao listar recebiveis pendentes");
    }

    const items = ((orders ?? []) as unknown as PendingReceivableOrder[])
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
        description: input.description,
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

  private async listCashEntrySummaryRows(filters: CashEntryFilters = {}) {
    let query = this.supabase
      .from("cash_entries")
      .select("type,category,amount,occurred_at")
      .order("occurred_at", { ascending: false });

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.startDate) {
      query = query.gte("occurred_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("occurred_at", filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao resumir caixa");
    }

    return (data ?? []) as unknown as CashEntrySummaryRow[];
  }
}
