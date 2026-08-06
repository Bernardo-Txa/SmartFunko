import "server-only";
import { env } from "@/lib/env";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

type CompetenceRow = {
  code: string;
  ends_on: string;
  id: string;
  label: string;
  starts_on: string;
  status: string;
};

type CustomerRow = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
};

type ReportOrderRow = {
  approval_status: string;
  competence_id: string;
  customer_id: string;
  customers?: CustomerRow | CustomerRow[] | null;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  paid_at: string | null;
  payment_status: string;
  source: string;
  total: number | string;
  v2_order_items?: Array<{
    product_name: string;
    product_sku: string | null;
    quantity: number | string;
    total_price: number | string;
    unit_price: number | string;
  }> | null;
  v2_payment_session_orders?: Array<{
    amount: number | string;
    v2_payment_sessions?: PaymentSessionRelation | PaymentSessionRelation[] | null;
  }> | null;
};

type PaymentSessionRelation = {
  checkout_number?: string | null;
  created_at?: string | null;
  payment_link_url?: string | null;
  status?: string | null;
};

export type MonthlyClosingOrderItem = {
  productName: string;
  productSku: string | null;
  quantity: number;
  total: number;
  unitPrice: number;
};

export type MonthlyClosingOrder = {
  id: string;
  items: MonthlyClosingOrderItem[];
  orderDate: string;
  orderNumber: string;
  paidAt: string | null;
  paymentLinkUrl: string | null;
  paymentStatus: string;
  productSummary: string;
  total: number;
};

export type MonthlyClosingCustomer = {
  customer: CustomerRow;
  latestPaymentLinkUrl: string | null;
  noteTotal: number;
  orderIdsPending: string[];
  paidOrders: MonthlyClosingOrder[];
  paidTotal: number;
  pendingOrders: MonthlyClosingOrder[];
  pendingTotal: number;
  siteAccountUrl: string;
  whatsappUrl: string | null;
};

export type MonthlyClosingReport = {
  competence: CompetenceRow | null;
  competencies: CompetenceRow[];
  customers: MonthlyClosingCustomer[];
  generatedAt: string;
  totals: {
    customers: number;
    noteTotal: number;
    paidOrders: number;
    paidTotal: number;
    pendingOrders: number;
    pendingTotal: number;
  };
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function digitsOnly(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeWhatsAppPhone(value: string | null | undefined) {
  const digits = digitsOnly(value);

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function customerSiteUrl() {
  const next = encodeURIComponent("/conta/pedidos-v2");
  return `${env.siteUrl}/login?next=${next}`;
}

function createWhatsAppUrl(phone: string | null | undefined, message: string) {
  const digits = normalizeWhatsAppPhone(phone);

  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function productSummary(items: MonthlyClosingOrderItem[]) {
  if (items.length === 0) {
    return "Pedido sem itens";
  }

  return items
    .slice(0, 2)
    .map((item) => `${item.quantity}x ${item.productName}`)
    .join(", ") + (items.length > 2 ? ` +${items.length - 2}` : "");
}

function getLatestPaymentLink(order: ReportOrderRow) {
  const sessions = (order.v2_payment_session_orders ?? [])
    .map((link) => firstRelation(link.v2_payment_sessions))
    .filter((session): session is PaymentSessionRelation => Boolean(session?.payment_link_url))
    .sort((first, second) => String(second.created_at ?? "").localeCompare(String(first.created_at ?? "")));

  return sessions[0]?.payment_link_url ?? null;
}

function mapOrder(row: ReportOrderRow): MonthlyClosingOrder {
  const items = (row.v2_order_items ?? []).map((item) => ({
    productName: item.product_name,
    productSku: item.product_sku,
    quantity: Number(item.quantity ?? 0),
    total: money(item.total_price),
    unitPrice: money(item.unit_price),
  }));

  return {
    id: row.id,
    items,
    orderDate: row.order_date,
    orderNumber: row.order_number,
    paidAt: row.paid_at,
    paymentLinkUrl: getLatestPaymentLink(row),
    paymentStatus: row.payment_status,
    productSummary: productSummary(items),
    total: money(row.total),
  };
}

function createClosingMessage(input: {
  competence: CompetenceRow;
  customerName: string;
  paidTotal: number;
  pendingOrders: MonthlyClosingOrder[];
  pendingTotal: number;
  siteAccountUrl: string;
}) {
  const pendingLines = input.pendingOrders
    .slice(0, 8)
    .map((order) => `- ${order.orderNumber}: ${order.productSummary}`);
  const extra = input.pendingOrders.length > pendingLines.length
    ? `- e mais ${input.pendingOrders.length - pendingLines.length} pedido(s)`
    : null;
  const lines = [
    `Oi, ${input.customerName}! Segue o fechamento Smart Funkos de ${input.competence.label}.`,
    `Total da nota: R$ ${(input.paidTotal + input.pendingTotal).toFixed(2).replace(".", ",")}`,
    `Ja pago: R$ ${input.paidTotal.toFixed(2).replace(".", ",")}`,
    `Pendente: R$ ${input.pendingTotal.toFixed(2).replace(".", ",")}`,
    "",
    input.pendingOrders.length > 0 ? "Pedidos pendentes:" : "Nenhum pedido pendente para pagamento.",
    ...pendingLines,
    extra,
    "",
    `Para acompanhar e pagar pelo site: ${input.siteAccountUrl}`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

export class MonthlyClosingReportService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
  ) {}

  async getReport(competenceId?: string | null): Promise<MonthlyClosingReport> {
    const competencies = await this.listCompetencies();
    const competence = competenceId
      ? competencies.find((item) => item.id === competenceId) ?? null
      : competencies.find((item) => item.status === "open") ?? competencies[0] ?? null;

    if (!competence) {
      return {
        competence: null,
        competencies,
        customers: [],
        generatedAt: new Date().toISOString(),
        totals: {
          customers: 0,
          noteTotal: 0,
          paidOrders: 0,
          paidTotal: 0,
          pendingOrders: 0,
          pendingTotal: 0,
        },
      };
    }

    const orders = await this.listOrdersForCompetence(competence.id);
    const customersById = new Map<string, MonthlyClosingCustomer>();
    const siteAccountUrl = customerSiteUrl();

    for (const row of orders) {
      const customer = firstRelation(row.customers);

      if (!customer) {
        continue;
      }

      const bucket = customersById.get(customer.id) ?? {
        customer,
        latestPaymentLinkUrl: null,
        noteTotal: 0,
        orderIdsPending: [],
        paidOrders: [],
        paidTotal: 0,
        pendingOrders: [],
        pendingTotal: 0,
        siteAccountUrl,
        whatsappUrl: null,
      };
      const order = mapOrder(row);

      if (row.payment_status === "pago") {
        bucket.paidOrders.push(order);
        bucket.paidTotal += order.total;
      } else {
        bucket.pendingOrders.push(order);
        bucket.pendingTotal += order.total;
        bucket.orderIdsPending.push(order.id);
        bucket.latestPaymentLinkUrl = bucket.latestPaymentLinkUrl ?? order.paymentLinkUrl;
      }

      bucket.noteTotal += order.total;
      customersById.set(customer.id, bucket);
    }

    const customers = Array.from(customersById.values())
      .map((row) => ({
        ...row,
        noteTotal: money(row.noteTotal),
        paidTotal: money(row.paidTotal),
        pendingTotal: money(row.pendingTotal),
        whatsappUrl: createWhatsAppUrl(row.customer.phone, createClosingMessage({
          competence,
          customerName: row.customer.name,
          paidTotal: row.paidTotal,
          pendingOrders: row.pendingOrders,
          pendingTotal: row.pendingTotal,
          siteAccountUrl: row.latestPaymentLinkUrl ?? row.siteAccountUrl,
        })),
      }))
      .sort((first, second) => second.pendingTotal - first.pendingTotal || first.customer.name.localeCompare(second.customer.name, "pt-BR"));

    return {
      competence,
      competencies,
      customers,
      generatedAt: new Date().toISOString(),
      totals: {
        customers: customers.length,
        noteTotal: money(customers.reduce((sum, customer) => sum + customer.noteTotal, 0)),
        paidOrders: customers.reduce((sum, customer) => sum + customer.paidOrders.length, 0),
        paidTotal: money(customers.reduce((sum, customer) => sum + customer.paidTotal, 0)),
        pendingOrders: customers.reduce((sum, customer) => sum + customer.pendingOrders.length, 0),
        pendingTotal: money(customers.reduce((sum, customer) => sum + customer.pendingTotal, 0)),
      },
    };
  }

  private async listCompetencies() {
    const { data, error } = await this.supabase
      .from("v2_order_competencies")
      .select("id,code,label,starts_on,ends_on,status")
      .order("starts_on", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar competencias do fechamento");
    }

    return (data ?? []) as CompetenceRow[];
  }

  private async listOrdersForCompetence(competenceId: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(`
        id,order_number,customer_id,competence_id,source,order_date,
        approval_status,payment_status,fulfillment_status,total,paid_at,
        customers(id,name,email,phone),
        v2_order_items(product_name,product_sku,quantity,unit_price,total_price),
        v2_payment_session_orders(
          amount,
          v2_payment_sessions(checkout_number,status,payment_link_url,created_at)
        )
      `)
      .eq("competence_id", competenceId)
      .eq("approval_status", "aprovado")
      .neq("fulfillment_status", "cancelado")
      .in("payment_status", ["nao_pago", "checkout_gerado", "pago"])
      .order("order_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao montar fechamento mensal");
    }

    return (data ?? []) as unknown as ReportOrderRow[];
  }
}
