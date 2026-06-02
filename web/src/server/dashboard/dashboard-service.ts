import "server-only";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

type DashboardOrder = {
  total: number;
  status: string;
  payments?: Array<{
    amount: number;
    status: string;
  }>;
};

export class DashboardService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async getAdminDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [ordersResult, cashResult, inventoryResult, latestOrdersResult] = await Promise.all([
      this.supabase
        .from("orders")
        .select("id,total,status,created_at,payments(amount,status)")
        .gte("created_at", startOfToday.toISOString()),
      this.supabase
        .from("cash_entries")
        .select("amount,type,occurred_at")
        .gte("occurred_at", startOfToday.toISOString()),
      this.supabase
        .from("inventory_items")
        .select("id,status"),
      this.supabase
        .from("orders")
        .select("id,order_number,total,status,created_at,customers(name)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (ordersResult.error) {
      throwQueryError(ordersResult.error, "Falha ao carregar pedidos do dashboard");
    }

    if (cashResult.error) {
      throwQueryError(cashResult.error, "Falha ao carregar caixa do dashboard");
    }

    if (inventoryResult.error) {
      throwQueryError(inventoryResult.error, "Falha ao carregar estoque do dashboard");
    }

    if (latestOrdersResult.error) {
      throwQueryError(latestOrdersResult.error, "Falha ao carregar ultimos pedidos");
    }

    const ordersToday = (ordersResult.data ?? []) as DashboardOrder[];
    const cashToday = cashResult.data ?? [];
    const inventory = inventoryResult.data ?? [];

    const soldToday = ordersToday.reduce((sum, order) => sum + Number(order.total), 0);
    const receivedToday = cashToday
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const pendingTotal = ordersToday.reduce((sum, order) => {
      const paid = (order.payments ?? [])
        .filter((payment) => payment.status === "paid")
        .reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
      return sum + Math.max(0, Number(order.total) - paid);
    }, 0);

    return {
      inventoryAvailable: inventory.filter((item) => item.status === "available").length,
      inventoryReserved: inventory.filter((item) => item.status === "reserved").length,
      latestOrders: latestOrdersResult.data ?? [],
      ordersAwaitingPayment: ordersToday.filter((order) => order.status === "pending_payment").length,
      ordersPaid: ordersToday.filter((order) => order.status === "paid").length,
      ordersToday: ordersToday.length,
      pendingTotal,
      receivedToday,
      soldToday,
    };
  }
}
