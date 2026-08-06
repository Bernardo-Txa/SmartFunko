import "server-only";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

type CustomerRelation = {
  name?: string | null;
  phone?: string | null;
};

type CompetenceRelation = {
  code?: string;
  ends_on?: string;
  id?: string;
  label?: string;
  starts_on?: string;
  status?: string;
};

export type DashboardV2Order = {
  approval_status: string;
  competence_id: string;
  created_at: string;
  customer_id: string;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  paid_at: string | null;
  payment_status: string;
  source: string;
  total: number | string;
  updated_at: string;
  customers?: CustomerRelation | CustomerRelation[] | null;
  v2_order_competencies?: CompetenceRelation | CompetenceRelation[] | null;
  v2_order_items?: Array<{
    product_name: string;
    quantity: number | string;
  }>;
};

export type DashboardV2PaymentSession = {
  amount: number | string;
  checkout_number: string;
  created_at: string;
  id: string;
  paid_at: string | null;
  payment_link_url: string | null;
  status: string;
  customers?: CustomerRelation | CustomerRelation[] | null;
  v2_order_competencies?: CompetenceRelation | CompetenceRelation[] | null;
};

type DashboardV2Competence = {
  code: string;
  ends_on: string;
  id: string;
  label: string;
  starts_on: string;
  status: string;
};

type TrendOrderRow = {
  approval_status: string;
  fulfillment_status: string;
  order_date: string;
  payment_status: string;
  total: number | string;
};

type TrendPaymentRow = {
  amount: number | string;
  paid_at: string | null;
  status: string;
};

const dashboardOrderSelect = `
  id,order_number,customer_id,competence_id,source,order_date,
  approval_status,payment_status,fulfillment_status,total,paid_at,created_at,updated_at,
  customers(name,phone),
  v2_order_competencies(id,code,label,starts_on,ends_on,status),
  v2_order_items(product_name,quantity)
`;

const dashboardPaymentSelect = `
  id,checkout_number,status,amount,payment_link_url,paid_at,created_at,
  customers(name,phone),
  v2_order_competencies(id,code,label,starts_on,ends_on,status)
`;

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function dateInSaoPaulo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00-03:00`);
  return dateInSaoPaulo(new Date(date.getTime() + days * 24 * 60 * 60 * 1000));
}

function timestampRangeForSaoPauloDate(dateString: string) {
  return {
    end: new Date(`${dateString}T23:59:59.999-03:00`).toISOString(),
    start: new Date(`${dateString}T00:00:00.000-03:00`).toISOString(),
  };
}

function isLiveOrder(order: Pick<DashboardV2Order | TrendOrderRow, "approval_status" | "fulfillment_status" | "payment_status">) {
  return (
    order.approval_status !== "recusado" &&
    order.payment_status !== "cancelado" &&
    order.fulfillment_status !== "cancelado"
  );
}

function isReceivable(order: Pick<DashboardV2Order, "approval_status" | "fulfillment_status" | "payment_status" | "total">) {
  return (
    order.approval_status === "aprovado" &&
    ["nao_pago", "checkout_gerado"].includes(order.payment_status) &&
    order.fulfillment_status !== "cancelado" &&
    toNumber(order.total) > 0
  );
}

function getAttentionPriority(order: DashboardV2Order) {
  if (order.approval_status === "aguardando_aprovacao") {
    return 1;
  }

  if (order.payment_status === "reembolso_pendente") {
    return 2;
  }

  if (order.payment_status === "checkout_gerado") {
    return 3;
  }

  if (order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento") {
    return 4;
  }

  if (order.payment_status === "pago" && order.fulfillment_status === "recebido") {
    return 5;
  }

  return 99;
}

function isAttentionOrder(order: DashboardV2Order) {
  return getAttentionPriority(order) < 99;
}

export class DashboardService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async getAdminDashboard() {
    const today = dateInSaoPaulo();
    const trendStartDate = addDays(today, -6);
    const trendStartTimestamp = timestampRangeForSaoPauloDate(trendStartDate).start;
    const currentCompetence = await this.getCurrentCompetence(today);
    const [
      currentOrders,
      todayOrders,
      latestOrders,
      recentPayments,
      trendOrders,
      trendPayments,
    ] = await Promise.all([
      currentCompetence ? this.getOrdersForCompetence(currentCompetence.id) : Promise.resolve([]),
      this.getOrdersForDate(today),
      this.getLatestOrders(),
      this.getRecentPaidSessions(),
      this.getTrendOrders(trendStartDate),
      this.getTrendPayments(trendStartTimestamp),
    ]);
    const liveCurrentOrders = currentOrders.filter(isLiveOrder);
    const liveTodayOrders = todayOrders.filter(isLiveOrder);
    const receivableOrders = liveCurrentOrders.filter(isReceivable);
    const paidOrders = liveCurrentOrders.filter((order) => order.payment_status === "pago");
    const paidAmount = paidOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const receivableAmount = receivableOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const currentAmount = liveCurrentOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const soldToday = liveTodayOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
    const receivedToday = trendPayments
      .filter((payment) => payment.paid_at && dateInSaoPaulo(new Date(payment.paid_at)) === today)
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const customersWithPending = uniqueValues(receivableOrders.map((order) => order.customer_id)).length;
    const attentionOrders = [...currentOrders]
      .filter(isAttentionOrder)
      .sort((first, second) => {
        const priorityDiff = getAttentionPriority(first) - getAttentionPriority(second);
        return priorityDiff || second.updated_at.localeCompare(first.updated_at);
      })
      .slice(0, 8);

    return {
      attentionOrders,
      currentCompetence: currentCompetence
        ? {
            ...currentCompetence,
            checkoutPendingOrders: liveCurrentOrders.filter((order) => order.payment_status === "checkout_gerado").length,
            currentAmount,
            customersWithPending,
            paidAmount,
            paidOrders: paidOrders.length,
            receivableAmount,
            receivableOrders: receivableOrders.length,
            receivedOrders: liveCurrentOrders.filter((order) => order.payment_status === "pago" && order.fulfillment_status === "recebido").length,
            requestedOrders: liveCurrentOrders.filter((order) => order.payment_status === "pago" && order.fulfillment_status === "solicitado").length,
            shippedOrders: liveCurrentOrders.filter((order) => order.payment_status === "pago" && order.fulfillment_status === "enviado").length,
            totalOrders: liveCurrentOrders.length,
          }
        : null,
      dailyTrend: this.createDailyTrend(trendStartDate, today, trendOrders, trendPayments),
      latestOrders,
      metrics: {
        closingOrders: liveCurrentOrders.filter((order) => order.payment_status === "pago" && order.fulfillment_status === "aguardando_fechamento").length,
        ordersToday: liveTodayOrders.length,
        receivedToday,
        receivableAmount,
        receivableOrders: receivableOrders.length,
        refundPendingOrders: currentOrders.filter((order) => order.payment_status === "reembolso_pendente").length,
        sitePendingApproval: liveCurrentOrders.filter((order) => order.approval_status === "aguardando_aprovacao").length,
        soldToday,
      },
      recentPayments,
      today,
    };
  }

  private async getCurrentCompetence(today: string) {
    const { data, error } = await this.supabase
      .from("v2_order_competencies")
      .select("id,code,label,starts_on,ends_on,status")
      .lte("starts_on", today)
      .gte("ends_on", today)
      .neq("status", "archived")
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle<DashboardV2Competence>();

    if (error) {
      throwQueryError(error, "Falha ao carregar competencia atual do dashboard");
    }

    if (data) {
      return data;
    }

    const fallback = await this.supabase
      .from("v2_order_competencies")
      .select("id,code,label,starts_on,ends_on,status")
      .eq("status", "open")
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle<DashboardV2Competence>();

    if (fallback.error) {
      throwQueryError(fallback.error, "Falha ao carregar competencia aberta do dashboard");
    }

    return fallback.data ?? null;
  }

  private async getOrdersForCompetence(competenceId: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(dashboardOrderSelect)
      .eq("competence_id", competenceId)
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      throwQueryError(error, "Falha ao carregar pedidos da competencia no dashboard");
    }

    return (data ?? []) as unknown as DashboardV2Order[];
  }

  private async getOrdersForDate(date: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select("id,approval_status,payment_status,fulfillment_status,total,order_date")
      .eq("order_date", date)
      .limit(500);

    if (error) {
      throwQueryError(error, "Falha ao carregar pedidos do dia no dashboard");
    }

    return (data ?? []) as unknown as TrendOrderRow[];
  }

  private async getLatestOrders() {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(dashboardOrderSelect)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      throwQueryError(error, "Falha ao carregar pedidos recentes V2");
    }

    return (data ?? []) as unknown as DashboardV2Order[];
  }

  private async getRecentPaidSessions() {
    const { data, error } = await this.supabase
      .from("v2_payment_sessions")
      .select(dashboardPaymentSelect)
      .eq("status", "paid")
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(6);

    if (error) {
      throwQueryError(error, "Falha ao carregar pagamentos recentes V2");
    }

    return (data ?? []) as unknown as DashboardV2PaymentSession[];
  }

  private async getTrendOrders(startDate: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select("order_date,total,approval_status,payment_status,fulfillment_status")
      .gte("order_date", startDate)
      .limit(1000);

    if (error) {
      throwQueryError(error, "Falha ao carregar tendencia de pedidos V2");
    }

    return (data ?? []) as unknown as TrendOrderRow[];
  }

  private async getTrendPayments(startTimestamp: string) {
    const { data, error } = await this.supabase
      .from("v2_payment_sessions")
      .select("amount,status,paid_at")
      .eq("status", "paid")
      .gte("paid_at", startTimestamp)
      .limit(1000);

    if (error) {
      throwQueryError(error, "Falha ao carregar tendencia de pagamentos V2");
    }

    return (data ?? []) as unknown as TrendPaymentRow[];
  }

  private createDailyTrend(
    startDate: string,
    endDate: string,
    orders: TrendOrderRow[],
    payments: TrendPaymentRow[],
  ) {
    const days = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      days.push({
        date: currentDate,
        orders: 0,
        received: 0,
        sold: 0,
      });
      currentDate = addDays(currentDate, 1);
    }

    const dayByDate = new Map(days.map((day) => [day.date, day]));

    for (const order of orders) {
      if (!isLiveOrder(order)) {
        continue;
      }

      const day = dayByDate.get(order.order_date);

      if (day) {
        day.orders += 1;
        day.sold += toNumber(order.total);
      }
    }

    for (const payment of payments) {
      if (!payment.paid_at) {
        continue;
      }

      const day = dayByDate.get(dateInSaoPaulo(new Date(payment.paid_at)));

      if (day) {
        day.received += toNumber(payment.amount);
      }
    }

    return days;
  }
}

export { firstRelation };
