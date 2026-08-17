import "server-only";
import { CashflowService } from "@/server/cashflow/cashflow-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export type BiFilters = {
  competenceId?: string;
  from?: string;
  origin?: string;
  paymentMethod?: string;
  seller?: string;
  to?: string;
};

type Relation<T> = T | T[] | null | undefined;

type V2PaymentSessionOrderRow = {
  amount?: number | string | null;
  v2_payment_sessions?: Relation<{
    paid_at?: string | null;
    status?: string | null;
  }>;
};

type V2OrderItemRow = {
  id?: string;
  item_context?: string | null;
  product_id?: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number | string;
  total_price: number | string;
  unit_price?: number | string;
};

type V2BiOrderRow = {
  approval_status: string;
  coupon_code: string | null;
  created_at: string;
  customer_id: string | null;
  customers?: Relation<{
    email?: string | null;
    id?: string | null;
    name?: string | null;
  }>;
  discount: number | string;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  paid_at: string | null;
  payment_status: string;
  seller: string | null;
  source: string;
  total: number | string;
  v2_order_items?: V2OrderItemRow[];
  v2_payment_session_orders?: V2PaymentSessionOrderRow[];
};

type RankingEntryRow = {
  customer_id: string;
  order_number: string;
  order_total: number | string;
  paid_at: string;
  rank_position: number | null;
  reward_status: string;
  customers?: {
    name?: string | null;
  } | null;
};

type Range = {
  from: string;
  to: string;
};

export type BiPeriodBucket = {
  amount: number;
  label: string;
  orders: number;
  period: string;
};

export type BiSellerRow = {
  amount: number;
  orders: number;
  seller: string;
};

export type BiOriginRow = {
  amount: number;
  items: number;
  origin: string;
};

export type BiPaymentMethodRow = {
  amount: number;
  count: number;
  method: string;
};

export type BiTopCustomerRow = {
  amount: number;
  averageTicket: number;
  email: string | null;
  lastOrderAt: string | null;
  name: string;
  orders: number;
  customerId: string | null;
  clubLevel: string | null;
};

export type BiTopProductRow = {
  amount: number;
  averageItemTicket: number;
  quantity: number;
  productId: string | null;
  productName: string;
  sku: string | null;
};

export type BiTopOrderRow = {
  amount: number;
  customerName: string;
  method: string;
  origin: string;
  orderNumber: string;
  orderId: string;
  paidAt: string | null;
  seller: string | null;
};

export type BiCouponUsageRow = {
  code: string;
  discount: number;
  orders: number;
};

export type BiMonthlyRankingSummary = {
  awardedAt: string | null;
  entries: Array<{
    customerName: string;
    orderNumber: string;
    orderTotal: number;
    paidAt: string;
    position: number | null;
    rewardStatus: string;
  }>;
  endsAt: string;
  id: string;
  month: number;
  startsAt: string;
  status: string;
  title: string;
  year: number;
};

export type BiOverview = {
  averageTicket: number;
  awaitingPaymentOrders: number;
  cashflowNet: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  paidOrders: number;
  raffleRevenue: number;
  underReviewOrders: number;
};

export type BiRaffleRevenueRow = {
  campaignId: string | null;
  campaignTitle: string;
  paidAmount: number;
  paidOrders: number;
  pendingAmount: number;
  pendingOrders: number;
  soldNumbers: number;
  pendingNumbers: number;
};

export type BiCashflowBucket = {
  expense: number;
  income: number;
  label: string;
  net: number;
  period: string;
};

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toIsoDay(value: string, end = false) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return end ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
  }

  return value;
}

function resolveRange(filters: BiFilters): Range {
  const now = new Date();
  const from = filters.from?.trim() ? toIsoDay(filters.from.trim()) : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = filters.to?.trim() ? toIsoDay(filters.to.trim(), true) : endOfDay(now).toISOString();
  return { from, to };
}

function inRange(value: string | null | undefined, range: Range) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= new Date(range.from).getTime() && time <= new Date(range.to).getTime();
}

function money(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function relationList<T>(value: Relation<T>): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function firstRelation<T>(value: Relation<T>) {
  return relationList(value)[0] ?? null;
}

function periodBucketKey(date: Date, daily: boolean) {
  if (daily) {
    return date.toISOString().slice(0, 10);
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodBucketLabel(key: string, daily: boolean) {
  if (!daily) {
    const [year, month] = key.split("-");
    return `${month}/${year}`;
  }

  const date = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function paymentMethodLabel(method: string | null | undefined) {
  const normalized = String(method ?? "").toLowerCase();

  if (normalized === "pix") {
    return "Pix";
  }

  if (normalized === "credit_card" || normalized === "debit_card" || normalized === "card") {
    return "Cartao";
  }

  if (normalized === "cash" || normalized === "manual") {
    return "Manual";
  }

  if (normalized === "infinitepay") {
    return "InfinitePay";
  }

  return normalized ? normalized : "InfinitePay";
}

function paymentMethodMatchesFilter(method: string | null | undefined, filter: string | undefined) {
  if (!filter) {
    return true;
  }

  const normalizedMethod = String(method ?? "").toLowerCase();
  const normalizedFilter = filter.toLowerCase();

  if (normalizedFilter === "card") {
    return normalizedMethod === "credit_card" || normalizedMethod === "debit_card" || normalizedMethod === "card";
  }

  if (normalizedFilter === "manual") {
    return normalizedMethod === "manual" || normalizedMethod === "cash";
  }

  return normalizedMethod === normalizedFilter;
}

function v2OriginLabel(source: string | null | undefined) {
  const normalized = String(source ?? "");

  if (normalized === "site") {
    return "Catalogo/site";
  }

  if (normalized === "admin_whatsapp") {
    return "WhatsApp";
  }

  if (normalized === "admin_manual") {
    return "Admin/manual";
  }

  if (normalized === "preorder") {
    return "Pre-venda";
  }

  return normalized || "Outros";
}

function v2OrderOriginMatchesFilter(order: V2BiOrderRow, filter: string | undefined) {
  if (!filter) {
    return true;
  }

  const normalizedFilter = filter.toLowerCase();

  if (normalizedFilter === "stock" || normalizedFilter === "website" || normalizedFilter === "site") {
    return order.source === "site";
  }

  if (normalizedFilter === "manual" || normalizedFilter === "admin") {
    return order.source === "admin_manual";
  }

  if (normalizedFilter === "whatsapp") {
    return order.source === "admin_whatsapp";
  }

  if (normalizedFilter === "national_order" || normalizedFilter === "international_order" || normalizedFilter === "preorder") {
    return order.source === "preorder";
  }

  return v2OriginLabel(order.source).toLowerCase() === normalizedFilter;
}

function v2ReportDate(order: V2BiOrderRow) {
  const date = order.order_date || order.created_at || order.paid_at;

  if (!date) {
    return new Date(0);
  }

  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00.000Z` : date);
}

function v2ReportDateIso(order: V2BiOrderRow) {
  return v2ReportDate(order).toISOString();
}

function isActiveV2Order(order: V2BiOrderRow) {
  return (
    order.approval_status !== "recusado" &&
    order.fulfillment_status !== "cancelado" &&
    !["cancelado", "reembolsado"].includes(order.payment_status)
  );
}

function isPaidV2Order(order: V2BiOrderRow) {
  return isActiveV2Order(order) && order.payment_status === "pago";
}

function isPendingPaymentV2Order(order: V2BiOrderRow) {
  return (
    isActiveV2Order(order) &&
    order.approval_status === "aprovado" &&
    ["nao_pago", "checkout_gerado"].includes(order.payment_status)
  );
}

function isUnderReviewV2Order(order: V2BiOrderRow) {
  return order.approval_status === "aguardando_aprovacao" && order.fulfillment_status !== "cancelado";
}

function v2PaymentMethod(order: V2BiOrderRow) {
  const sessionOrders = order.v2_payment_session_orders ?? [];
  const hasSession = sessionOrders.some((sessionOrder) => firstRelation(sessionOrder.v2_payment_sessions));

  return hasSession ? "infinitepay" : "manual";
}

function v2OrderMatchesFilters(order: V2BiOrderRow, filters: BiFilters, includePaymentMethod = false) {
  if (filters.seller && order.seller !== filters.seller) {
    return false;
  }

  if (!v2OrderOriginMatchesFilter(order, filters.origin)) {
    return false;
  }

  if (includePaymentMethod && !paymentMethodMatchesFilter(v2PaymentMethod(order), filters.paymentMethod)) {
    return false;
  }

  return true;
}

function rangeDate(value: string) {
  return value.slice(0, 10);
}

export class BIService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async getBiOverview(filters: BiFilters = {}): Promise<BiOverview> {
    const [orders, cashflowSummary, raffleRevenue] = await Promise.all([
      this.loadV2Orders(filters),
      this.getCashflowSummary(filters),
      this.getRaffleRevenue(filters),
    ]);
    const paidOrders = orders.filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const pendingOrders = orders.filter((order) => isPendingPaymentV2Order(order) && v2OrderMatchesFilters(order, filters));
    const underReviewOrders = orders.filter((order) => isUnderReviewV2Order(order) && v2OrderMatchesFilters(order, filters)).length;
    const awaitingPaymentOrders = pendingOrders.length;
    const confirmedRevenue = paidOrders.reduce((sum, order) => sum + money(order.total), 0);
    const pendingRevenue = pendingOrders.reduce((sum, order) => sum + money(order.total), 0);

    return {
      averageTicket: paidOrders.length > 0 ? confirmedRevenue / paidOrders.length : 0,
      awaitingPaymentOrders,
      cashflowNet: cashflowSummary.netInPeriod,
      confirmedRevenue,
      pendingRevenue,
      paidOrders: paidOrders.length,
      raffleRevenue: raffleRevenue.amount,
      underReviewOrders,
    };
  }

  async getSalesByPeriod(filters: BiFilters = {}): Promise<BiPeriodBucket[]> {
    const range = resolveRange(filters);
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const from = new Date(range.from);
    const to = new Date(range.to);
    const diffDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
    const daily = diffDays <= 35;
    const buckets = new Map<string, { amount: number; orders: Set<string> }>();

    for (const order of orders) {
      const key = periodBucketKey(v2ReportDate(order), daily);
      const bucket = buckets.get(key) ?? { amount: 0, orders: new Set<string>() };
      bucket.amount += money(order.total);
      bucket.orders.add(order.id);
      buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
      .sort(([left], [right]) => (left < right ? -1 : 1))
      .map(([period, bucket]) => ({
        amount: bucket.amount,
        label: periodBucketLabel(period, daily),
        orders: bucket.orders.size,
        period,
      }));
  }

  async getSalesBySeller(filters: BiFilters = {}): Promise<BiSellerRow[]> {
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const totals = new Map<string, { amount: number; orders: Set<string> }>();

    for (const order of orders) {
      const seller = order.seller ?? "unassigned";
      const bucket = totals.get(seller) ?? { amount: 0, orders: new Set<string>() };
      bucket.amount += money(order.total);
      bucket.orders.add(order.id);
      totals.set(seller, bucket);
    }

    return Array.from(totals.entries())
      .map(([seller, bucket]) => ({
        amount: bucket.amount,
        orders: bucket.orders.size,
        seller,
      }))
      .sort((left, right) => right.amount - left.amount);
  }

  async getSalesByOrigin(filters: BiFilters = {}): Promise<BiOriginRow[]> {
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const totals = new Map<string, { amount: number; items: number }>();

    for (const order of orders) {
      const key = v2OriginLabel(order.source);
      const bucket = totals.get(key) ?? { amount: 0, items: 0 };
      bucket.amount += money(order.total);
      bucket.items += (order.v2_order_items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
      totals.set(key, bucket);
    }

    return Array.from(totals.entries())
      .map(([origin, bucket]) => ({
        amount: bucket.amount,
        items: bucket.items,
        origin,
      }))
      .sort((left, right) => right.amount - left.amount);
  }

  async getSalesByPaymentMethod(filters: BiFilters = {}): Promise<BiPaymentMethodRow[]> {
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const totals = new Map<string, { amount: number; count: number }>();

    for (const order of orders) {
      const method = paymentMethodLabel(v2PaymentMethod(order));
      const bucket = totals.get(method) ?? { amount: 0, count: 0 };
      bucket.amount += money(order.total);
      bucket.count += 1;
      totals.set(method, bucket);
    }

    return Array.from(totals.entries())
      .map(([method, bucket]) => ({
        amount: bucket.amount,
        count: bucket.count,
        method,
      }))
      .sort((left, right) => right.amount - left.amount);
  }

  async getTopCustomers(filters: BiFilters = {}): Promise<BiTopCustomerRow[]> {
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const totals = new Map<
      string,
      { amount: number; email: string | null; lastOrderAt: string | null; name: string; orders: Set<string> }
    >();

    for (const order of orders) {
      const customer = firstRelation(order.customers);
      const customerId = order.customer_id ?? customer?.email ?? customer?.name ?? order.id;
      const orderDate = v2ReportDateIso(order);
      const bucket = totals.get(customerId) ?? {
        amount: 0,
        email: customer?.email ?? null,
        lastOrderAt: null,
        name: customer?.name ?? "Cliente",
        orders: new Set<string>(),
      };
      bucket.amount += money(order.total);
      bucket.orders.add(order.id);
      if (!bucket.lastOrderAt || orderDate > bucket.lastOrderAt) {
        bucket.lastOrderAt = orderDate;
      }
      totals.set(customerId, bucket);
    }

    const rewardLevels = await this.loadRewardLevels(Array.from(totals.keys()));

    return Array.from(totals.entries())
      .map(([customerId, bucket]) => ({
        amount: bucket.amount,
        averageTicket: bucket.orders.size > 0 ? bucket.amount / bucket.orders.size : 0,
        clubLevel: rewardLevels.get(customerId) ?? null,
        email: bucket.email,
        lastOrderAt: bucket.lastOrderAt,
        name: bucket.name,
        orders: bucket.orders.size,
        customerId,
      }))
      .sort((left, right) => right.amount - left.amount);
  }

  async getTopProducts(filters: BiFilters = {}): Promise<BiTopProductRow[]> {
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const totals = new Map<
      string,
      { amount: number; averageItemTicket: number; quantity: number; productId: string | null; productName: string; sku: string | null }
    >();

    for (const order of orders) {
      for (const item of order.v2_order_items ?? []) {
        const key = item.product_sku ?? item.product_id ?? item.product_name;
        const bucket = totals.get(key) ?? {
          amount: 0,
          averageItemTicket: 0,
          quantity: 0,
          productId: item.product_id ?? null,
          productName: item.product_name || item.product_sku || "Produto sem nome",
          sku: item.product_sku ?? null,
        };
        bucket.amount += money(item.total_price);
        bucket.quantity += Number(item.quantity ?? 0);
        bucket.averageItemTicket = bucket.quantity > 0 ? bucket.amount / bucket.quantity : 0;
        totals.set(key, bucket);
      }
    }

    return Array.from(totals.values()).sort((left, right) => right.amount - left.amount);
  }

  async getTopOrders(filters: BiFilters = {}): Promise<BiTopOrderRow[]> {
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));

    return orders
      .map((order) => {
        const customer = firstRelation(order.customers);

        return {
          amount: money(order.total),
          customerName: customer?.name ?? "Cliente",
          method: paymentMethodLabel(v2PaymentMethod(order)),
          origin: v2OriginLabel(order.source),
          orderId: order.id,
          orderNumber: order.order_number,
          paidAt: order.paid_at ?? v2ReportDateIso(order),
          seller: order.seller,
        };
      })
      .filter((order) => order.amount > 0)
      .sort((left, right) => right.amount - left.amount);
  }

  async getRaffleRevenue(filters: BiFilters = {}) {
    const range = resolveRange(filters);
    const { data: raffleOrders, error: raffleError } = await this.supabase
      .from("raffle_orders")
      .select("id,total_amount,status,paid_at,payment_status")
      .or("status.eq.paid,payment_status.eq.paid")
      .gte("paid_at", range.from)
      .lte("paid_at", range.to)
      .limit(1500);

    if (raffleError) {
      throwQueryError(raffleError, "Falha ao carregar receita de rifas");
    }

    return {
      amount: (raffleOrders ?? []).reduce((sum, order) => sum + money(order.total_amount), 0),
      orders: (raffleOrders ?? []).length,
      source: "raffle_orders" as const,
    };
  }

  async getRaffleRevenueByCampaign(filters: BiFilters = {}): Promise<BiRaffleRevenueRow[]> {
    const range = resolveRange(filters);
    const { data, error } = await this.supabase
      .from("raffle_orders")
      .select("id,raffle_campaign_id,total_amount,quantity,status,payment_status,paid_at,created_at,raffle_campaigns(id,title)")
      .lte("created_at", range.to)
      .limit(1500);

    if (error) {
      throwQueryError(error, "Falha ao carregar rifas por campanha");
    }

    const totals = new Map<string, BiRaffleRevenueRow>();

    for (const order of (data ?? []) as unknown as Array<{
      created_at: string;
      paid_at: string | null;
      payment_status?: string | null;
      quantity: number;
      raffle_campaign_id: string | null;
      raffle_campaigns?: { id?: string | null; title?: string | null } | null;
      status: string;
      total_amount: number | string;
    }>) {
      const isPaid = order.status === "paid" || order.payment_status === "paid";
      const isPending = ["reserved", "pending_payment"].includes(order.status) && order.payment_status !== "paid";
      const paidInRange = isPaid && inRange(order.paid_at, range);
      const pendingInRange = isPending && inRange(order.created_at, range);

      if (!paidInRange && !pendingInRange) {
        continue;
      }

      const campaignId = order.raffle_campaign_id ?? order.raffle_campaigns?.id ?? "unknown";
      const current =
        totals.get(campaignId) ??
        {
          campaignId: order.raffle_campaign_id,
          campaignTitle: order.raffle_campaigns?.title ?? "Rifa",
          paidAmount: 0,
          paidOrders: 0,
          pendingAmount: 0,
          pendingOrders: 0,
          pendingNumbers: 0,
          soldNumbers: 0,
        };

      if (paidInRange) {
        current.paidAmount += money(order.total_amount);
        current.paidOrders += 1;
        current.soldNumbers += Number(order.quantity ?? 0);
      }

      if (pendingInRange) {
        current.pendingAmount += money(order.total_amount);
        current.pendingOrders += 1;
        current.pendingNumbers += Number(order.quantity ?? 0);
      }

      totals.set(campaignId, current);
    }

    return Array.from(totals.values()).sort((left, right) => right.paidAmount - left.paidAmount);
  }

  async getCashflowByPeriod(filters: BiFilters = {}): Promise<BiCashflowBucket[]> {
    const range = resolveRange(filters);
    const from = new Date(range.from);
    const to = new Date(range.to);
    const diffDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
    const daily = diffDays <= 35;
    const { data, error } = await this.supabase
      .from("cash_entries")
      .select("type,amount,occurred_at")
      .gte("occurred_at", range.from)
      .lte("occurred_at", range.to)
      .order("occurred_at", { ascending: true })
      .limit(1500);

    if (error) {
      throwQueryError(error, "Falha ao carregar caixa por periodo");
    }

    const totals = new Map<string, { expense: number; income: number }>();

    for (const entry of (data ?? []) as Array<{ amount: number | string; occurred_at: string; type: string }>) {
      const key = periodBucketKey(new Date(entry.occurred_at), daily);
      const bucket = totals.get(key) ?? { expense: 0, income: 0 };

      if (entry.type === "income") {
        bucket.income += money(entry.amount);
      } else if (entry.type === "expense") {
        bucket.expense += money(entry.amount);
      } else if (entry.type === "adjustment") {
        bucket.income += money(entry.amount);
      }

      totals.set(key, bucket);
    }

    return Array.from(totals.entries())
      .sort(([left], [right]) => (left < right ? -1 : 1))
      .map(([period, bucket]) => ({
        expense: bucket.expense,
        income: bucket.income,
        label: periodBucketLabel(period, daily),
        net: bucket.income - bucket.expense,
        period,
      }));
  }

  async getCashflowSummary(filters: BiFilters = {}) {
    const range = resolveRange(filters);
    return new CashflowService(this.supabase).getCashflowSummary({
      endDate: range.to,
      startDate: range.from,
    });
  }

  async getCouponUsage(filters: BiFilters = {}): Promise<BiCouponUsageRow[]> {
    const orders = (await this.loadV2Orders(filters)).filter((order) => isPaidV2Order(order) && v2OrderMatchesFilters(order, filters, true));
    const totals = new Map<string, { discount: number; orders: Set<string> }>();

    for (const order of orders) {
      if (!order.coupon_code) {
        continue;
      }

      const bucket = totals.get(order.coupon_code) ?? { discount: 0, orders: new Set<string>() };
      bucket.discount += money(order.discount);
      bucket.orders.add(order.id);
      totals.set(order.coupon_code, bucket);
    }

    return Array.from(totals.entries())
      .map(([code, bucket]) => ({
        code,
        discount: bucket.discount,
        orders: bucket.orders.size,
      }))
      .sort((left, right) => right.discount - left.discount);
  }

  async getMonthlyRankingSummary(filters: BiFilters = {}): Promise<BiMonthlyRankingSummary | null> {
    const range = resolveRange(filters);
    const anchor = new Date(filters.to ?? range.to);
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth() + 1;

    const { data: ranking, error } = await this.supabase
      .from("monthly_order_rankings")
      .select("id,year,month,title,status,first_place_reward,second_place_reward,third_place_reward,starts_at,ends_at,awarded_at")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao carregar ranking mensal");
    }

    if (!ranking) {
      return null;
    }

    const { data: entries, error: entriesError } = await this.supabase
      .from("monthly_order_ranking_entries")
      .select("customer_id,order_number,order_total,paid_at,rank_position,reward_status,customers(name)")
      .eq("ranking_id", ranking.id)
      .order("rank_position", { ascending: true, nullsFirst: false })
      .order("order_total", { ascending: false });

    if (entriesError) {
      throwQueryError(entriesError, "Falha ao carregar entradas do ranking mensal");
    }

    return {
      awardedAt: ranking.awarded_at,
      endsAt: ranking.ends_at,
      entries: ((entries ?? []) as unknown as RankingEntryRow[]).map((entry) => ({
        customerName: entry.customers?.name ?? "Cliente",
        orderNumber: entry.order_number,
        orderTotal: money(entry.order_total),
        paidAt: entry.paid_at,
        position: entry.rank_position,
        rewardStatus: entry.reward_status,
      })),
      id: ranking.id,
      month: ranking.month,
      startsAt: ranking.starts_at,
      status: ranking.status,
      title: ranking.title,
      year: ranking.year,
    };
  }

  private async loadV2Orders(filters: BiFilters = {}) {
    const range = resolveRange(filters);
    let query = this.supabase
      .from("v2_orders")
      .select(`
        id,order_number,customer_id,competence_id,source,order_date,created_at,
        approval_status,payment_status,fulfillment_status,seller,total,discount,coupon_code,paid_at,
        customers(id,name,email),
        v2_order_items(id,product_id,item_context,product_name,product_sku,quantity,unit_price,total_price),
        v2_payment_session_orders(
          amount,
          v2_payment_sessions(status,paid_at)
        )
      `)
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000);

    if (filters.competenceId) {
      query = query.eq("competence_id", filters.competenceId);
    } else {
      query = query.gte("order_date", rangeDate(range.from)).lte("order_date", rangeDate(range.to));
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao carregar pedidos V2 do BI");
    }

    return ((data ?? []) as unknown as V2BiOrderRow[]).filter((order) => {
      if (!filters.competenceId && !inRange(v2ReportDateIso(order), range)) {
        return false;
      }

      return isActiveV2Order(order) || isUnderReviewV2Order(order);
    });
  }

  private async loadRewardLevels(customerIds: string[]) {
    const ids = customerIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));

    if (ids.length === 0) {
      return new Map<string, string>();
    }

    const { data, error } = await this.supabase
      .from("reward_profiles")
      .select("customer_id,level")
      .in("customer_id", ids);

    if (error) {
      return new Map<string, string>();
    }

    return new Map((data ?? []).map((profile) => [profile.customer_id as string, profile.level as string]));
  }
}
