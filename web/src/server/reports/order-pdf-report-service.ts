import "server-only";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";
import { ReportCompetenceService, type ReportCompetence } from "./report-competencies";

type CustomerRow = {
  email: string | null;
  id: string;
  name: string | null;
  phone: string | null;
  status?: string | null;
};

type TemporaryCustomerRow = {
  id: string;
  merged_customer_id?: string | null;
  name: string | null;
  phone: string | null;
  status?: string | null;
};

type ReportOrderRow = {
  approval_status: string;
  competence_id: string;
  created_at: string;
  customer_id: string | null;
  customers?: CustomerRow | CustomerRow[] | null;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  payment_status: string;
  seller: string | null;
  source: string;
  temporary_customer_id: string | null;
  temporary_customers?: TemporaryCustomerRow | TemporaryCustomerRow[] | null;
  total: number | string;
  v2_order_items?: Array<{
    item_context?: string | null;
    product_id?: string | null;
    product_name: string;
    product_sku: string | null;
    quantity: number | string;
    supplier_id?: string | null;
    total_price: number | string;
    unit_price: number | string;
  }> | null;
};

export type OrderPdfCustomer = {
  email: string | null;
  id: string;
  kind: "customer" | "temporary" | "unknown";
  name: string;
  phone: string | null;
};

export type OrderPdfReportItem = {
  productName: string;
  productSku: string | null;
  quantity: number;
  total: number;
  unitPrice: number;
};

export type OrderPdfReportOrder = {
  approvalStatus: string;
  customer: OrderPdfCustomer;
  fulfillmentStatus: string;
  id: string;
  items: OrderPdfReportItem[];
  orderDate: string;
  orderNumber: string;
  paymentStatus: string;
  productSummary: string;
  seller: string | null;
  source: string;
  total: number;
};

export type OrderPdfCustomerSection = {
  customer: OrderPdfCustomer;
  orders: OrderPdfReportOrder[];
  totals: {
    amount: number;
    orders: number;
    quantity: number;
  };
};

export type OrderPdfProductLine = {
  customer: OrderPdfCustomer;
  fulfillmentStatus: string;
  orderDate: string;
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  quantity: number;
  seller: string | null;
  source: string;
  total: number;
  unitPrice: number;
};

export type OrderPdfProductSection = {
  amount: number;
  customerCount: number;
  key: string;
  lines: OrderPdfProductLine[];
  orderCount: number;
  productName: string;
  productSku: string | null;
  quantity: number;
};

export type OrderPdfReportKind = "customer_map" | "supplier_request";

export type OrderPdfReport = {
  competence: ReportCompetence | null;
  competencies: ReportCompetence[];
  customerSections: OrderPdfCustomerSection[];
  generatedAt: string;
  kind: OrderPdfReportKind;
  productSections: OrderPdfProductSection[];
  totals: {
    amount: number;
    customers: number;
    orders: number;
    products: number;
    quantity: number;
  };
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function mapCustomer(row: ReportOrderRow): OrderPdfCustomer {
  const customer = firstRelation(row.customers);
  const temporaryCustomer = firstRelation(row.temporary_customers);

  if (customer) {
    return {
      email: customer.email,
      id: customer.id,
      kind: "customer",
      name: customer.name?.trim() || "Cliente",
      phone: customer.phone,
    };
  }

  if (temporaryCustomer) {
    return {
      email: null,
      id: temporaryCustomer.id,
      kind: "temporary",
      name: temporaryCustomer.name?.trim() || "Cliente temporario",
      phone: temporaryCustomer.phone,
    };
  }

  return {
    email: null,
    id: `unknown:${row.id}`,
    kind: "unknown",
    name: "Cliente sem cadastro",
    phone: null,
  };
}

function mapOrder(row: ReportOrderRow): OrderPdfReportOrder {
  const items = (row.v2_order_items ?? []).map((item) => ({
    productName: item.product_name || "Produto",
    productSku: item.product_sku,
    quantity: Number(item.quantity ?? 0),
    total: money(item.total_price),
    unitPrice: money(item.unit_price),
  }));
  const productSummary = items.length > 0
    ? items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")
    : "Pedido sem itens";

  return {
    approvalStatus: row.approval_status,
    customer: mapCustomer(row),
    fulfillmentStatus: row.fulfillment_status,
    id: row.id,
    items,
    orderDate: row.order_date,
    orderNumber: row.order_number,
    paymentStatus: row.payment_status,
    productSummary,
    seller: row.seller,
    source: row.source,
    total: money(row.total),
  };
}

function getCustomerKey(customer: OrderPdfCustomer) {
  return `${customer.kind}:${customer.id}`;
}

function getProductKey(item: OrderPdfReportItem) {
  return `${normalizeKey(item.productName)}::${normalizeKey(item.productSku ?? "")}`;
}

function paymentSortWeight(status: string) {
  return status === "pago" ? 0 : 1;
}

function emptyReport(kind: OrderPdfReportKind, competencies: ReportCompetence[], competence: ReportCompetence | null): OrderPdfReport {
  return {
    competence,
    competencies,
    customerSections: [],
    generatedAt: new Date().toISOString(),
    kind,
    productSections: [],
    totals: {
      amount: 0,
      customers: 0,
      orders: 0,
      products: 0,
      quantity: 0,
    },
  };
}

function buildReport(kind: OrderPdfReportKind, competencies: ReportCompetence[], competence: ReportCompetence, rows: ReportOrderRow[]): OrderPdfReport {
  const orders = rows.map(mapOrder);
  const customers = new Map<string, OrderPdfCustomerSection>();
  const products = new Map<string, OrderPdfProductSection>();
  const uniqueCustomers = new Set<string>();
  const uniqueOrders = new Set<string>();

  for (const order of orders) {
    const customerKey = getCustomerKey(order.customer);
    uniqueCustomers.add(customerKey);
    uniqueOrders.add(order.id);

    const customerSection = customers.get(customerKey) ?? {
      customer: order.customer,
      orders: [],
      totals: {
        amount: 0,
        orders: 0,
        quantity: 0,
      },
    };

    customerSection.orders.push(order);
    customerSection.totals.amount += order.total;
    customerSection.totals.orders += 1;
    customerSection.totals.quantity += order.items.reduce((sum, item) => sum + item.quantity, 0);
    customers.set(customerKey, customerSection);

    for (const item of order.items) {
      const productKey = getProductKey(item);
      const productSection = products.get(productKey) ?? {
        amount: 0,
        customerCount: 0,
        key: productKey,
        lines: [],
        orderCount: 0,
        productName: item.productName,
        productSku: item.productSku,
        quantity: 0,
      };

      productSection.amount += item.total;
      productSection.quantity += item.quantity;
      productSection.lines.push({
        customer: order.customer,
        fulfillmentStatus: order.fulfillmentStatus,
        orderDate: order.orderDate,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        quantity: item.quantity,
        seller: order.seller,
        source: order.source,
        total: item.total,
        unitPrice: item.unitPrice,
      });
      products.set(productKey, productSection);
    }
  }

  const customerSections = Array.from(customers.values())
    .map((section) => ({
      ...section,
      orders: section.orders.sort((first, second) => first.orderDate.localeCompare(second.orderDate) || first.orderNumber.localeCompare(second.orderNumber)),
      totals: {
        amount: money(section.totals.amount),
        orders: section.totals.orders,
        quantity: section.totals.quantity,
      },
    }))
    .sort((first, second) => first.customer.name.localeCompare(second.customer.name, "pt-BR"));

  const productSections = Array.from(products.values())
    .map((section) => {
      const lineCustomers = new Set(section.lines.map((line) => getCustomerKey(line.customer)));
      const lineOrders = new Set(section.lines.map((line) => line.orderId));

      return {
        ...section,
        amount: money(section.amount),
        customerCount: lineCustomers.size,
        lines: section.lines.sort((first, second) => (
          paymentSortWeight(first.paymentStatus) - paymentSortWeight(second.paymentStatus)
        ) || first.customer.name.localeCompare(second.customer.name, "pt-BR") || first.orderNumber.localeCompare(second.orderNumber)),
        orderCount: lineOrders.size,
      };
    })
    .sort((first, second) => {
      const firstHasPaid = first.lines.some((line) => line.paymentStatus === "pago");
      const secondHasPaid = second.lines.some((line) => line.paymentStatus === "pago");

      if (firstHasPaid !== secondHasPaid) {
        return firstHasPaid ? -1 : 1;
      }

      return second.quantity - first.quantity || first.productName.localeCompare(second.productName, "pt-BR");
    });

  const amount = kind === "supplier_request"
    ? productSections.reduce((sum, section) => sum + section.amount, 0)
    : customerSections.reduce((sum, section) => sum + section.totals.amount, 0);
  const quantity = kind === "supplier_request"
    ? productSections.reduce((sum, section) => sum + section.quantity, 0)
    : customerSections.reduce((sum, section) => sum + section.totals.quantity, 0);

  return {
    competence,
    competencies,
    customerSections,
    generatedAt: new Date().toISOString(),
    kind,
    productSections,
    totals: {
      amount: money(amount),
      customers: uniqueCustomers.size,
      orders: uniqueOrders.size,
      products: productSections.length,
      quantity,
    },
  };
}

export class OrderPdfReportService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
  ) {}

  async getCustomerMapReport(competenceId?: string | null) {
    return this.getReport("customer_map", competenceId);
  }

  async getSupplierRequestReport(competenceId?: string | null) {
    return this.getReport("supplier_request", competenceId);
  }

  private async getReport(kind: OrderPdfReportKind, competenceId?: string | null) {
    const competenceService = new ReportCompetenceService(this.supabase);
    const competencies = await competenceService.listCompetencies();
    const competence = competenceService.resolveSelected(competencies, competenceId);

    if (!competence) {
      return emptyReport(kind, competencies, null);
    }

    const rows = await this.listOrdersForReport(competence.id, kind);
    return buildReport(kind, competencies, competence, rows);
  }

  private async listOrdersForReport(competenceId: string, kind: OrderPdfReportKind) {
    let query = this.supabase
      .from("v2_orders")
      .select(`
        id,order_number,customer_id,temporary_customer_id,competence_id,source,order_date,created_at,
        approval_status,payment_status,fulfillment_status,seller,total,
        customers(id,name,email,phone,status),
        temporary_customers(id,name,phone,status,merged_customer_id),
        v2_order_items(product_name,product_sku,quantity,unit_price,total_price,item_context,product_id,supplier_id)
      `)
      .eq("competence_id", competenceId)
      .eq("approval_status", "aprovado")
      .neq("fulfillment_status", "cancelado")
      .order("order_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (kind === "supplier_request") {
      query = query
        .eq("fulfillment_status", "aguardando_fechamento")
        .in("payment_status", ["pago", "nao_pago", "checkout_gerado"]);
    } else {
      query = query.in("payment_status", ["nao_pago", "checkout_gerado", "pago"]);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao montar relatorio de pedidos");
    }

    return (data ?? []) as unknown as ReportOrderRow[];
  }
}
