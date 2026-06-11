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
    created_at?: string;
    customer_id?: string | null;
    customers?: {
      email?: string | null;
      name?: string | null;
    } | null;
    discount?: number | string | null;
    id?: string;
    order_number?: string | null;
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
  email: string | null;
  name: string;
  orders: number;
  customerId: string | null;
};

export type BiTopProductRow = {
  amount: number;
  quantity: number;
  productId: string | null;
  productName: string;
  sku: string | null;
};

export type BiTopOrderRow = {
  amount: number;
  customerName: string;
  orderNumber: string;
  orderId: string;
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

  if (normalized === "credit_card") {
    return "Cartao de credito";
  }

  if (normalized === "debit_card") {
    return "Cartao de debito";
  }

  if (normalized === "cash") {
    return "Dinheiro";
  }

  if (normalized === "manual") {
    return "Manual";
  }

  if (normalized === "infinitepay") {
    return "InfinitePay";
  }

  return normalized ? normalized : "InfinitePay";
}

function originLabel(origin: string | null | undefined) {
  const normalized = String(origin ?? "");

  if (normalized === "stock") {
    return "Pronta-entrega";
  }

  if (normalized === "national_order") {
    return "Encomenda nacional";
  }

  if (normalized === "international_order") {
    return "Importado";
  }

  if (normalized === "preorder") {
    return "Pre-venda";
  }

  if (normalized === "auction") {
    return "Leilao";
  }

  return normalized || "Sem origem";
}

export class BIService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async getBiOverview(filters: BiFilters = {}): Promise<BiOverview> {
    const [salesEntries, cashflowSummary, pendingRevenue, underReviewOrders, awaitingPaymentOrders, raffleRevenue] =
      await Promise.all([
        this.listSaleCashEntries(filters),
        this.getCashflowSummary(filters),
        this.countCurrentPendingOrders(),
        this.countOrdersByReviewStatus("under_review"),
        this.countAwaitingPaymentOrders(),
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
    const totals = new Map<string, { amount: number; items: number }>();

    for (const order of orders) {
      for (const item of order.order_items ?? []) {
        if (item.status === "cancelled") {
          continue;
        }

        const key = originLabel(item.source);
        const bucket = totals.get(key) ?? { amount: 0, items: 0 };
        bucket.amount += money(item.total_price);
        bucket.items += Number(item.quantity ?? 0);
        totals.set(key, bucket);
      }
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
    const totals = new Map<string, { amount: number; email: string | null; name: string; orders: Set<string> }>();

    for (const entry of salesEntries) {
      if (!entry.order_id) {
        continue;
      }

      const order = orderById.get(entry.order_id);
      const customerId = order?.customer_id ?? order?.customers?.email ?? order?.customers?.name ?? entry.order_id;
      const bucket = totals.get(customerId) ?? {
        amount: 0,
        email: order?.customers?.email ?? null,
        name: order?.customers?.name ?? "Cliente",
        orders: new Set<string>(),
      };
      bucket.amount += money(entry.amount);
      bucket.orders.add(entry.order_id);
      totals.set(customerId, bucket);
    }

    return Array.from(totals.entries())
      .map(([customerId, bucket]) => ({
        amount: bucket.amount,
        email: bucket.email,
        name: bucket.name,
        orders: bucket.orders.size,
        customerId,
      }))
      .sort((left, right) => right.amount - left.amount);
  }

  async getTopProducts(filters: BiFilters = {}): Promise<BiTopProductRow[]> {
    const orders = await this.loadPaidOrders(filters);
    const totals = new Map<string, { amount: number; quantity: number; productId: string | null; productName: string; sku: string | null }>();

    for (const order of orders) {
      for (const item of order.order_items ?? []) {
        if (item.status === "cancelled") {
          continue;
        }

        const product = item.product_variants?.products ?? null;
        const key = item.product_variants?.sku ?? product?.id ?? `${item.source}:${item.total_price}`;
        const bucket = totals.get(key) ?? {
          amount: 0,
          quantity: 0,
          productId: product?.id ?? null,
          productName: product?.name ?? item.product_variants?.sku ?? "Produto sem nome",
          sku: item.product_variants?.sku ?? null,
        };
        bucket.amount += money(item.total_price);
        bucket.quantity += Number(item.quantity ?? 0);
        totals.set(key, bucket);
      }
    }

    return Array.from(totals.values()).sort((left, right) => right.amount - left.amount);
  }

  async getTopOrders(filters: BiFilters = {}): Promise<BiTopOrderRow[]> {
    const orders = await this.loadPaidOrders(filters);
    const salesEntries = await this.listSaleCashEntries(filters);
    const paidByOrder = new Map<string, number>();

    for (const entry of salesEntries) {
      if (!entry.order_id) {
        continue;
      }

      paidByOrder.set(entry.order_id, (paidByOrder.get(entry.order_id) ?? 0) + money(entry.amount));
    }

    return orders
      .map((order) => ({
        amount: paidByOrder.get(order.id) ?? money(order.total),
        customerName: order.customers?.name ?? "Cliente",
        orderId: order.id,
        orderNumber: order.order_number,
        seller: order.seller,
      }))
      .filter((order) => order.amount > 0)
      .sort((left, right) => right.amount - left.amount);
  }

  async getRaffleRevenue(filters: BiFilters = {}) {
    const range = resolveRange(filters);
    const { data: cashEntries, error: cashError } = await this.supabase
      .from("cash_entries")
      .select("amount,occurred_at,order_id,category,type")
      .eq("category", "raffle")
      .eq("type", "income")
      .gte("occurred_at", range.from)
      .lte("occurred_at", range.to)
      .limit(1500);

    if (cashError) {
      throwQueryError(cashError, "Falha ao carregar receita de rifas");
    }

    const cashRevenue = (cashEntries ?? []).reduce((sum, entry) => sum + money(entry.amount), 0);

    if ((cashEntries ?? []).length > 0) {
      return {
        amount: cashRevenue,
        orders: new Set((cashEntries ?? []).map((entry) => entry.order_id).filter((value): value is string => Boolean(value))).size,
        source: "cash_entries" as const,
      };
    }

    const { data: raffleOrders, error: raffleError } = await this.supabase
      .from("raffle_orders")
      .select("id,total_amount,status,paid_at,payment_status,customers(name)")
      .eq("status", "paid")
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
            id,order_number,total,status,review_status,seller,discount,shipping_amount,coupon_code,created_at,
            customers(id,name,email)
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

      if (filters.seller && row.orders?.seller !== filters.seller) {
        return false;
      }

      if (filters.paymentMethod && String(row.payments?.method ?? "").toLowerCase() !== filters.paymentMethod.toLowerCase()) {
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
          id,customer_id,order_number,total,status,review_status,seller,discount,coupon_code,
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
      if (filters.seller && order.seller !== filters.seller) {
        return false;
      }

      if (filters.origin) {
        const originMatch = (order.order_items ?? []).some((item) => item.source === filters.origin);
        if (!originMatch) {
          return false;
        }
      }

      return true;
    });
  }

  private async countOrdersByReviewStatus(status: string) {
    const { count, error } = await this.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("review_status", status);

    if (error) {
      throwQueryError(error, "Falha ao contar pedidos por status de analise");
    }

    return count ?? 0;
  }

  private async countAwaitingPaymentOrders() {
    const { count, error } = await this.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .or("review_status.eq.awaiting_payment,status.in.(pending_payment,partially_paid)");

    if (error) {
      throwQueryError(error, "Falha ao contar pedidos aguardando pagamento");
    }

    return count ?? 0;
  }

  private async countCurrentPendingOrders() {
    const { data, error } = await this.supabase
      .from("orders")
      .select("total,status,review_status,payments(amount,status)")
      .not("status", "in", "(cancelled,refunded)");

    if (error) {
      throwQueryError(error, "Falha ao calcular pendencias atuais");
    }

    return ((data ?? []) as Array<{
      payments?: Array<{ amount: number | string; status: string }>;
      status: string;
      total: number | string;
    }>).reduce((sum, order) => {
      const paid = (order.payments ?? [])
        .filter((payment) => payment.status === "paid")
        .reduce((paymentSum, payment) => paymentSum + money(payment.amount), 0);
      return sum + Math.max(0, money(order.total) - paid);
    }, 0);
  }
}
