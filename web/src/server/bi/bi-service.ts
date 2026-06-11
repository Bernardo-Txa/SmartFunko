import "server-only";
import { CashflowService } from "@/server/cashflow/cashflow-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export type BiFilters = {
  from?: string;
  origin?: string;
  paymentMethod?: string;
  seller?: string;
  to?: string;
};

type SaleCashEntryRow = {
  amount: number | string;
  occurred_at: string;
  order_id: string | null;
  orders?: {
    coupon_code?: string | null;
    channel?: string | null;
    created_at?: string;
    customer_id?: string | null;
    customers?: {
      email?: string | null;
      name?: string | null;
    } | null;
    discount?: number | string | null;
    id?: string;
    order_items?: Array<{
      source: string;
      status: string;
    }>;
    order_number?: string | null;
    payment_provider?: string | null;
    review_status?: string | null;
    seller?: string | null;
    shipping_amount?: number | string | null;
    status?: string | null;
    total?: number | string | null;
  } | null;
  payments?: {
    amount?: number | string | null;
    fee_amount?: number | string | null;
    method?: string | null;
    net_amount?: number | string | null;
    paid_at?: string | null;
    status?: string | null;
  } | null;
};

type OrderAggregateRow = {
  coupon_code: string | null;
  customer_id: string | null;
  channel?: string;
  customers?: {
    email?: string | null;
    name?: string | null;
  } | null;
  discount: number | string;
  id: string;
  order_items?: Array<{
    id?: string;
    quantity: number;
    source: string;
    status: string;
    total_price: number | string;
    product_variants?: {
      products?: {
        id?: string;
        name?: string | null;
        slug?: string | null;
      } | null;
      sku?: string | null;
    } | null;
  }>;
  order_number: string;
  review_status: string;
  seller: string | null;
  status: string;
  total: number | string;
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

function uniqueOrdersFromEntries(rows: SaleCashEntryRow[]) {
  return Array.from(new Set(rows.map((row) => row.order_id).filter((value): value is string => Boolean(value))));
}

function isExcludedOrderStatus(status: string | null | undefined) {
  return ["cancelled", "refunded"].includes(String(status ?? "").toLowerCase());
}

function isExcludedReviewStatus(status: string | null | undefined) {
  return ["under_review", "rejected", "cancelled"].includes(String(status ?? "").toLowerCase());
}

function isConfirmedSaleEntry(row: SaleCashEntryRow) {
  if (!row.order_id || !row.orders) {
    return false;
  }

  if (isExcludedOrderStatus(row.orders.status) || isExcludedReviewStatus(row.orders.review_status)) {
    return false;
  }

  if (row.payments?.status && row.payments.status !== "paid") {
    return false;
  }

  return money(row.amount) > 0;
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

function originLabel(origin: string | null | undefined) {
  const normalized = String(origin ?? "");

  if (normalized === "stock") {
    return "Catalogo/site";
  }

  if (normalized === "website") {
    return "Catalogo/site";
  }

  if (normalized === "whatsapp") {
    return "WhatsApp";
  }

  if (normalized === "admin") {
    return "Admin/manual";
  }

  if (normalized === "national_order" || normalized === "international_order" || normalized === "preorder") {
    return "Encomenda";
  }

  if (normalized === "auction") {
    return "Leilao";
  }

  if (normalized === "raffle") {
    return "Rifa";
  }

  return normalized || "Outros";
}

function orderPrimaryOrigin(order: OrderAggregateRow) {
  const channel = String(order.channel ?? "");

  if (channel === "website") {
    return "Catalogo/site";
  }

  if (channel === "whatsapp") {
    return "WhatsApp";
  }

  if (channel === "admin") {
    return "Admin/manual";
  }

  if (channel === "preorder") {
    return "Encomenda";
  }

  const itemOrigins = (order.order_items ?? [])
    .filter((item) => item.status !== "cancelled")
    .map((item) => originLabel(item.source));

  if (itemOrigins.includes("Leilao")) {
    return "Leilao";
  }

  if (itemOrigins.includes("Encomenda")) {
    return "Encomenda";
  }

  if (itemOrigins.includes("Catalogo/site")) {
    return "Catalogo/site";
  }

  return "Outros";
}

function orderOriginMatchesFilter(order: OrderAggregateRow, filter: string) {
  const normalizedFilter = filter.toLowerCase();
  const primary = orderPrimaryOrigin(order).toLowerCase();

  if (normalizedFilter === "stock" || normalizedFilter === "website") {
    return primary === "catalogo/site";
  }

  if (normalizedFilter === "manual" || normalizedFilter === "admin") {
    return primary === "admin/manual";
  }

  if (normalizedFilter === "whatsapp") {
    return primary === "whatsapp";
  }

  if (normalizedFilter === "raffle") {
    return primary === "rifa";
  }

  if (normalizedFilter === "national_order" || normalizedFilter === "international_order" || normalizedFilter === "preorder") {
    return primary === "encomenda";
  }

  if (normalizedFilter === "auction") {
    return primary === "leilao";
  }

  return primary === normalizedFilter;
}

export class BIService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async getBiOverview(filters: BiFilters = {}): Promise<BiOverview> {
    const [salesEntries, cashflowSummary, pendingRevenue, underReviewOrders, awaitingPaymentOrders, raffleRevenue] =
      await Promise.all([
        this.listSaleCashEntries(filters),
        this.getCashflowSummary(filters),
        this.countCurrentPendingOrders(filters),
        this.countOrdersByReviewStatus("under_review", filters),
        this.countAwaitingPaymentOrders(filters),
        this.getRaffleRevenue(filters),
      ]);

    const confirmedRevenue = salesEntries.reduce((sum, entry) => sum + money(entry.amount), 0);
    const paidOrders = uniqueOrdersFromEntries(salesEntries).length;

    return {
      averageTicket: paidOrders > 0 ? confirmedRevenue / paidOrders : 0,
      awaitingPaymentOrders,
      cashflowNet: cashflowSummary.netInPeriod,
      confirmedRevenue,
      pendingRevenue,
      paidOrders,
      raffleRevenue: raffleRevenue.amount,
      underReviewOrders,
    };
  }

  async getSalesByPeriod(filters: BiFilters = {}): Promise<BiPeriodBucket[]> {
    const range = resolveRange(filters);
    const salesEntries = await this.listSaleCashEntries(filters);
    const from = new Date(range.from);
    const to = new Date(range.to);
    const diffDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
    const daily = diffDays <= 35;
    const buckets = new Map<string, { amount: number; orders: Set<string> }>();

    for (const entry of salesEntries) {
      const date = new Date(entry.occurred_at);
      const key = periodBucketKey(date, daily);
      const bucket = buckets.get(key) ?? { amount: 0, orders: new Set<string>() };
      bucket.amount += money(entry.amount);
      if (entry.order_id) {
        bucket.orders.add(entry.order_id);
      }
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
    const entries = await this.listSaleCashEntries(filters);
    const totals = new Map<string, { amount: number; orders: Set<string> }>();

    for (const entry of entries) {
      const seller = entry.orders?.seller ?? "unassigned";
      const bucket = totals.get(seller) ?? { amount: 0, orders: new Set<string>() };
      bucket.amount += money(entry.amount);
      if (entry.order_id) {
        bucket.orders.add(entry.order_id);
      }
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
    const orders = await this.loadPaidOrders(filters);
    const saleEntries = await this.listSaleCashEntries(filters);
    const paidByOrder = new Map<string, number>();

    for (const entry of saleEntries) {
      if (!entry.order_id) {
        continue;
      }

      paidByOrder.set(entry.order_id, (paidByOrder.get(entry.order_id) ?? 0) + money(entry.amount));
    }

    const totals = new Map<string, { amount: number; items: number }>();

    for (const order of orders) {
      const key = orderPrimaryOrigin(order);
      const bucket = totals.get(key) ?? { amount: 0, items: 0 };
      bucket.amount += paidByOrder.get(order.id) ?? money(order.total);
      bucket.items += (order.order_items ?? [])
        .filter((item) => item.status !== "cancelled")
        .reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
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
    const entries = await this.listSaleCashEntries(filters);
    const totals = new Map<string, { amount: number; count: number }>();

    for (const entry of entries) {
      const method = paymentMethodLabel(entry.payments?.method);
      const bucket = totals.get(method) ?? { amount: 0, count: 0 };
      bucket.amount += money(entry.amount);
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
    const orders = await this.loadPaidOrders(filters);
    const salesEntries = await this.listSaleCashEntries(filters);
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const totals = new Map<
      string,
      { amount: number; email: string | null; lastOrderAt: string | null; name: string; orders: Set<string> }
    >();

    for (const entry of salesEntries) {
      if (!entry.order_id) {
        continue;
      }

      const order = orderById.get(entry.order_id);
      const customerId = order?.customer_id ?? order?.customers?.email ?? order?.customers?.name ?? entry.order_id;
      const bucket = totals.get(customerId) ?? {
        amount: 0,
        email: order?.customers?.email ?? null,
        lastOrderAt: null,
        name: order?.customers?.name ?? "Cliente",
        orders: new Set<string>(),
      };
      bucket.amount += money(entry.amount);
      bucket.orders.add(entry.order_id);
      if (!bucket.lastOrderAt || entry.occurred_at > bucket.lastOrderAt) {
        bucket.lastOrderAt = entry.occurred_at;
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
    const orders = await this.loadPaidOrders(filters);
    const totals = new Map<
      string,
      { amount: number; averageItemTicket: number; quantity: number; productId: string | null; productName: string; sku: string | null }
    >();

    for (const order of orders) {
      for (const item of order.order_items ?? []) {
        if (item.status === "cancelled") {
          continue;
        }

        const product = item.product_variants?.products ?? null;
        const key = item.product_variants?.sku ?? product?.id ?? `${item.source}:${item.total_price}`;
        const bucket = totals.get(key) ?? {
          amount: 0,
          averageItemTicket: 0,
          quantity: 0,
          productId: product?.id ?? null,
          productName: product?.name ?? item.product_variants?.sku ?? "Produto sem nome",
          sku: item.product_variants?.sku ?? null,
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
    const orders = await this.loadPaidOrders(filters);
    const salesEntries = await this.listSaleCashEntries(filters);
    const paidByOrder = new Map<string, { amount: number; method: string; paidAt: string | null }>();

    for (const entry of salesEntries) {
      if (!entry.order_id) {
        continue;
      }

      const current = paidByOrder.get(entry.order_id) ?? { amount: 0, method: "Outros", paidAt: null };
      current.amount += money(entry.amount);
      current.method = paymentMethodLabel(entry.payments?.method);
      if (!current.paidAt || entry.occurred_at > current.paidAt) {
        current.paidAt = entry.occurred_at;
      }
      paidByOrder.set(entry.order_id, current);
    }

    return orders
      .map((order) => {
        const paid = paidByOrder.get(order.id);
        return {
          amount: paid?.amount ?? money(order.total),
          customerName: order.customers?.name ?? "Cliente",
          method: paid?.method ?? "Outros",
          origin: orderPrimaryOrigin(order),
          orderId: order.id,
          orderNumber: order.order_number,
          paidAt: paid?.paidAt ?? null,
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
    const orders = await this.loadPaidOrders(filters);
    const totals = new Map<string, { discount: number; orders: Set<string> }>();

    for (const order of orders) {
      if (!order.coupon_code || order.status === "cancelled" || order.status === "refunded") {
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

  private async listSaleCashEntries(filters: BiFilters = {}) {
    const range = resolveRange(filters);
    const { data, error } = await this.supabase
      .from("cash_entries")
      .select(
        `
          amount,occurred_at,order_id,
          orders(
            id,order_number,total,status,review_status,seller,discount,shipping_amount,coupon_code,created_at,payment_provider,
            customers(id,name,email),
            order_items(source,status)
          ),
          payments(id,method,status,paid_at,amount,fee_amount,net_amount)
        `,
      )
      .eq("type", "income")
      .eq("category", "sale")
      .gte("occurred_at", range.from)
      .lte("occurred_at", range.to)
      .order("occurred_at", { ascending: false })
      .limit(1500);

    if (error) {
      throwQueryError(error, "Falha ao carregar vendas do BI");
    }

    const entries = ((data ?? []) as unknown as SaleCashEntryRow[]).filter((row) => {
      if (!inRange(row.occurred_at, range)) {
        return false;
      }

      if (!isConfirmedSaleEntry(row)) {
        return false;
      }

      if (filters.seller && row.orders?.seller !== filters.seller) {
        return false;
      }

      if (!paymentMethodMatchesFilter(row.payments?.method, filters.paymentMethod)) {
        return false;
      }

      if (filters.origin) {
        if (!row.orders || !orderOriginMatchesFilter(row.orders as OrderAggregateRow, filters.origin)) {
          return false;
        }
      }

      if (filters.origin === "raffle" || filters.paymentMethod === "raffle") {
        return false;
      }

      return true;
    });

    return entries;
  }

  private async loadPaidOrders(filters: BiFilters = {}) {
    const saleEntries = await this.listSaleCashEntries(filters);
    const orderIds = uniqueOrdersFromEntries(saleEntries);

    if (orderIds.length === 0) {
      return [] as OrderAggregateRow[];
    }

    const { data, error } = await this.supabase
      .from("orders")
      .select(
        `
          id,customer_id,order_number,total,status,review_status,seller,discount,coupon_code,channel,
          customers(id,name,email),
          order_items(
            id,quantity,total_price,source,status,
            product_variants(
              sku,
              products(id,name,slug)
            )
          )
        `,
      )
      .in("id", orderIds)
      .not("status", "in", "(cancelled,refunded)")
      .order("created_at", { ascending: false })
      .limit(1500);

    if (error) {
      throwQueryError(error, "Falha ao carregar pedidos pagos do BI");
    }

    return ((data ?? []) as unknown as OrderAggregateRow[]).filter((order) => {
      if (isExcludedReviewStatus(order.review_status)) {
        return false;
      }

      if (filters.seller && order.seller !== filters.seller) {
        return false;
      }

      if (filters.origin) {
        if (!orderOriginMatchesFilter(order, filters.origin)) {
          return false;
        }
      }

      return true;
    });
  }

  private async countOrdersByReviewStatus(status: string, filters: BiFilters = {}) {
    const range = resolveRange(filters);
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,seller,channel,order_items(source,status),review_status,status,created_at")
      .eq("review_status", status)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .limit(1500);

    if (error) {
      throwQueryError(error, "Falha ao contar pedidos por status de analise");
    }

    return ((data ?? []) as unknown as OrderAggregateRow[])
      .filter((order) => {
        if (filters.seller && order.seller !== filters.seller) {
          return false;
        }

        if (filters.origin && !orderOriginMatchesFilter(order, filters.origin)) {
          return false;
        }

        return true;
      })
      .length;
  }

  private async countAwaitingPaymentOrders(filters: BiFilters = {}) {
    const range = resolveRange(filters);
    const { data, error } = await this.supabase
      .from("orders")
      .select("id,seller,channel,order_items(source,status),review_status,status,created_at,payments(amount,status)")
      .or("review_status.eq.awaiting_payment,status.in.(pending_payment,partially_paid)")
      .not("review_status", "in", "(under_review,rejected,cancelled)")
      .not("status", "in", "(cancelled,refunded)")
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .limit(1500);

    if (error) {
      throwQueryError(error, "Falha ao contar pedidos aguardando pagamento");
    }

    return ((data ?? []) as unknown as OrderAggregateRow[])
      .filter((order) => {
        if (filters.seller && order.seller !== filters.seller) {
          return false;
        }

        if (filters.origin && !orderOriginMatchesFilter(order, filters.origin)) {
          return false;
        }

        return true;
      })
      .length;
  }

  private async countCurrentPendingOrders(filters: BiFilters = {}) {
    const range = resolveRange(filters);
    const { data, error } = await this.supabase
      .from("orders")
      .select("total,status,review_status,seller,channel,created_at,payments(amount,status),order_items(source,status)")
      .not("status", "in", "(cancelled,refunded)")
      .gte("created_at", range.from)
      .lte("created_at", range.to);

    if (error) {
      throwQueryError(error, "Falha ao calcular pendencias atuais");
    }

    return ((data ?? []) as Array<{
      payments?: Array<{ amount: number | string; status: string }>;
      review_status?: string | null;
      seller?: string | null;
      status: string;
      total: number | string;
    }>)
      .filter((order) => {
        if (isExcludedReviewStatus(order.review_status)) {
          return false;
        }

        if (filters.seller && order.seller !== filters.seller) {
          return false;
        }

        if (filters.origin && !orderOriginMatchesFilter(order as OrderAggregateRow, filters.origin)) {
          return false;
        }

        const reviewStatus = String(order.review_status ?? "");
        return (
          ["approved_for_payment", "awaiting_payment", "paid"].includes(reviewStatus) ||
          ["pending_payment", "partially_paid"].includes(order.status)
        );
      })
      .reduce((sum, order) => {
        const paid = (order.payments ?? [])
          .filter((payment) => payment.status === "paid")
          .reduce((paymentSum, payment) => paymentSum + money(payment.amount), 0);
        return sum + Math.max(0, money(order.total) - paid);
      }, 0);
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
