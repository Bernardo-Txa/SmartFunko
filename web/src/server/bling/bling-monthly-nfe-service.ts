import "server-only";
import { z } from "zod";
import { badRequest, conflict, internalError, notFound } from "@/server/http/errors";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import {
  BlingApiError,
  createBlingNfe,
  getBlingNfe,
  sendBlingNfe,
  type BlingNfeCreatePayload,
} from "@/server/bling/bling-client";
import {
  BlingNfeService,
  buildNfePayload,
  dataFromEnvelope,
  issueFieldsFromBling,
  nowIso,
  sanitizeResponsePayload,
  type BlingNfeIssueStatus,
  type OrderForNfe,
} from "@/server/bling/bling-nfe-service";

export const createMonthlyNfeSchema = z.object({
  competenceId: z.string().uuid(),
  customerId: z.string().uuid(),
  numero: z.string().trim().max(9).optional().default(""),
});

export const monthlyNfeActionSchema = z.object({
  enviarEmail: z.boolean().optional().default(false),
});

type CompetenceRow = { id: string; code: string; label: string; starts_on: string; ends_on: string; status: string };
type CustomerRow = { id: string; name: string; email: string | null; phone: string | null; cpf: string | null };
type ItemRow = { id: string; product_name: string; product_sku: string | null; quantity: number | string; unit_price: number | string };
type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  temporary_customer_id: string | null;
  competence_id: string;
  order_date: string;
  paid_at: string | null;
  payment_status: string;
  approval_status: string;
  fulfillment_status: string;
  discount: number | string;
  total: number | string;
  customers?: CustomerRow | CustomerRow[] | null;
  v2_order_items?: ItemRow[] | null;
};

type IssueRow = {
  id: string;
  competence_id: string;
  customer_id: string;
  status: BlingNfeIssueStatus;
  bling_nfe_id: string | null;
  bling_number: string | null;
  bling_series: string | null;
  access_key: string | null;
  danfe_url: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  error_message: string | null;
  emitted_at: string | null;
  sent_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

const ISSUE_SELECT = "id,competence_id,customer_id,status,bling_nfe_id,bling_number,bling_series,access_key,danfe_url,pdf_url,xml_url,error_message,emitted_at,sent_at,last_synced_at,created_at,updated_at";

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function money(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function mapIssue(row: IssueRow | null) {
  if (!row) return null;
  return {
    accessKey: row.access_key,
    blingNfeId: row.bling_nfe_id,
    blingNumber: row.bling_number,
    blingSeries: row.bling_series,
    competenceId: row.competence_id,
    createdAt: row.created_at,
    customerId: row.customer_id,
    danfeUrl: row.danfe_url,
    emittedAt: row.emitted_at,
    errorMessage: row.error_message,
    id: row.id,
    lastSyncedAt: row.last_synced_at,
    pdfUrl: row.pdf_url,
    sentAt: row.sent_at,
    status: row.status,
    updatedAt: row.updated_at,
    xmlUrl: row.xml_url,
  };
}

function buildCombinedOrder(orders: OrderRow[], competence: CompetenceRow): OrderForNfe {
  const first = orders[0];
  const customer = firstRelation(first?.customers);

  if (!first || !customer) throw badRequest("Cliente sem pedidos validos para a NF-e mensal");

  return {
    approval_status: "aprovado",
    customer_id: customer.id,
    customers: customer,
    discount: money(orders.reduce((sum, order) => sum + money(order.discount), 0)),
    fulfillment_status: "aguardando_fechamento",
    id: `${competence.id}:${customer.id}`,
    order_date: competence.ends_on,
    order_number: `MENSAL-${competence.code}`.slice(0, 50),
    paid_at: orders.map((order) => order.paid_at).filter(Boolean).sort().at(-1) ?? competence.ends_on,
    payment_status: "pago",
    temporary_customer_id: null,
    total: money(orders.reduce((sum, order) => sum + money(order.total), 0)),
    v2_order_items: orders.flatMap((order) => order.v2_order_items ?? []),
  };
}

function statusFromFields(fields: ReturnType<typeof issueFieldsFromBling>, fallback: BlingNfeIssueStatus) {
  return (fields.status ?? fallback) as BlingNfeIssueStatus;
}

export class BlingMonthlyNfeService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string | null,
  ) {}

  async getReport(competenceId?: string | null) {
    const competencies = await this.listCompetencies();
    const competence = competenceId
      ? competencies.find((item) => item.id === competenceId) ?? null
      : competencies.find((item) => item.status === "open") ?? competencies[0] ?? null;

    if (!competence) return { competence: null, competencies, customers: [], totals: { customers: 0, eligibleOrders: 0, total: 0 } };

    const [orders, issueResult] = await Promise.all([
      this.listPaidOrders(competence.id),
      this.supabase
        .from("bling_monthly_nfe_issues")
        .select(ISSUE_SELECT)
        .eq("competence_id", competence.id),
    ]);
    const { data: issues, error: issueError } = issueResult;
    if (issueError) throw internalError("Falha ao carregar NF-e mensais");

    const individualResult = orders.length > 0
      ? await this.supabase
          .from("bling_nfe_issues")
          .select("order_id,bling_nfe_id")
          .in("order_id", orders.map((order) => order.id))
      : { data: [], error: null };
    if (individualResult.error) throw internalError("Falha ao verificar notas individuais");
    const individualIssues = individualResult.data;
    const individuallyInvoiced = new Set((individualIssues ?? []).map((row) => row.order_id));
    const issueByCustomer = new Map(((issues ?? []) as IssueRow[]).map((issue) => [issue.customer_id, issue]));
    const grouped = new Map<string, { customer: CustomerRow; orders: OrderRow[] }>();

    for (const order of orders) {
      const customer = firstRelation(order.customers);
      if (!customer || individuallyInvoiced.has(order.id)) continue;
      const bucket = grouped.get(customer.id) ?? { customer, orders: [] };
      bucket.orders.push(order);
      grouped.set(customer.id, bucket);
    }

    const customers = Array.from(grouped.values()).map(({ customer, orders: customerOrders }) => ({
      customer,
      issue: mapIssue(issueByCustomer.get(customer.id) ?? null),
      orders: customerOrders.map((order) => ({ id: order.id, number: order.order_number, total: money(order.total) })),
      total: money(customerOrders.reduce((sum, order) => sum + money(order.total), 0)),
    })).sort((a, b) => b.total - a.total || a.customer.name.localeCompare(b.customer.name, "pt-BR"));

    return {
      competence,
      competencies,
      customers,
      totals: {
        customers: customers.length,
        eligibleOrders: customers.reduce((sum, row) => sum + row.orders.length, 0),
        total: money(customers.reduce((sum, row) => sum + row.total, 0)),
      },
    };
  }

  async createIssue(input: z.infer<typeof createMonthlyNfeSchema>) {
    const competence = await this.getCompetence(input.competenceId);
    const existing = await this.getIssue(input.competenceId, input.customerId);
    if (existing?.bling_nfe_id) throw conflict("Este cliente ja possui NF-e mensal nesta competencia");

    const orders = await this.getEligibleCustomerOrders(input.competenceId, input.customerId, existing?.id);
    if (orders.length === 0) throw conflict("Nenhum pedido pago disponivel para esta NF-e mensal");

    const combinedOrder = buildCombinedOrder(orders, competence);
    const numero = await new BlingNfeService(this.supabase).resolveSuggestedInvoiceNumber(input.numero);
    const payload: BlingNfeCreatePayload = buildNfePayload(combinedOrder, { numero });
    payload.observacoes = `Pedidos SmartFunkos: ${orders.map((order) => order.order_number).join(", ")}`.slice(0, 1000);

    const issue = existing ?? await this.insertDraft(input, payload);
    await this.linkOrders(issue.id, orders.map((order) => order.id));

    try {
      const response = await createBlingNfe(payload);
      const fields = issueFieldsFromBling(dataFromEnvelope(response), "created");
      if (!fields.bling_nfe_id) throw internalError("Bling criou a NF-e, mas nao retornou o ID");
      return this.updateIssue(issue.id, {
        ...fields,
        bling_number: fields.bling_number ?? numero,
        emitted_at: fields.status === "authorized" ? nowIso() : null,
        error_message: null,
        last_synced_at: nowIso(),
        request_payload: payload,
        response_payload: sanitizeResponsePayload(response),
        sent_at: ["authorized", "sent"].includes(fields.status) ? nowIso() : null,
      });
    } catch (error) {
      if (error instanceof BlingApiError) {
        await this.updateIssue(issue.id, { error_message: error.message, request_payload: payload, response_payload: sanitizeResponsePayload(error.body), status: "failed" });
        throw badRequest(`Bling recusou a NF-e mensal: ${error.message}`);
      }
      throw error;
    }
  }

  async sendIssue(issueId: string, enviarEmail: boolean) {
    const existing = await this.getIssueById(issueId);
    if (!existing.bling_nfe_id) throw conflict("Crie a NF-e no Bling antes de enviar");
    if (existing.status === "authorized") return mapIssue(existing);

    try {
      const sent = await sendBlingNfe(existing.bling_nfe_id, enviarEmail);
      const response = await getBlingNfe(existing.bling_nfe_id);
      const fields = issueFieldsFromBling(dataFromEnvelope(response), "sent");
      const status = statusFromFields(fields, "sent") === "created" ? "sent" : statusFromFields(fields, "sent");
      return this.updateIssue(issueId, {
        ...fields,
        bling_nfe_id: fields.bling_nfe_id ?? existing.bling_nfe_id,
        bling_number: fields.bling_number ?? existing.bling_number,
        emitted_at: status === "authorized" ? nowIso() : existing.emitted_at,
        error_message: null,
        last_synced_at: nowIso(),
        response_payload: sanitizeResponsePayload({ details: response, send: sent }),
        sent_at: existing.sent_at ?? nowIso(),
        status,
      });
    } catch (error) {
      if (error instanceof BlingApiError) {
        await this.updateIssue(issueId, { error_message: error.message, response_payload: sanitizeResponsePayload(error.body), status: "failed" });
        throw badRequest(`Bling nao enviou a NF-e mensal: ${error.message}`);
      }
      throw error;
    }
  }

  async syncIssue(issueId: string) {
    const existing = await this.getIssueById(issueId);
    if (!existing.bling_nfe_id) throw conflict("Crie a NF-e no Bling antes de atualizar");
    const response = await getBlingNfe(existing.bling_nfe_id);
    const fields = issueFieldsFromBling(dataFromEnvelope(response), existing.status);
    const status = statusFromFields(fields, existing.status);
    return this.updateIssue(issueId, {
      ...fields,
      bling_nfe_id: fields.bling_nfe_id ?? existing.bling_nfe_id,
      bling_number: fields.bling_number ?? existing.bling_number,
      emitted_at: status === "authorized" ? existing.emitted_at ?? nowIso() : existing.emitted_at,
      error_message: ["failed", "rejected"].includes(status) ? existing.error_message : null,
      last_synced_at: nowIso(),
      response_payload: sanitizeResponsePayload(response),
      sent_at: ["authorized", "sent"].includes(status) ? existing.sent_at ?? nowIso() : existing.sent_at,
      status,
    });
  }

  private async listCompetencies() {
    const { data, error } = await this.supabase.from("v2_order_competencies").select("id,code,label,starts_on,ends_on,status").order("starts_on", { ascending: false });
    if (error) throw internalError("Falha ao listar competencias");
    return (data ?? []) as CompetenceRow[];
  }

  private async getCompetence(id: string) {
    const { data, error } = await this.supabase.from("v2_order_competencies").select("id,code,label,starts_on,ends_on,status").eq("id", id).maybeSingle();
    if (error) throw internalError("Falha ao carregar competencia");
    if (!data) throw notFound("Competencia nao encontrada");
    return data as CompetenceRow;
  }

  private async listPaidOrders(competenceId: string) {
    const { data, error } = await this.supabase.from("v2_orders").select(`id,order_number,customer_id,temporary_customer_id,competence_id,order_date,paid_at,payment_status,approval_status,fulfillment_status,discount,total,customers(id,name,email,phone,cpf),v2_order_items(id,product_name,product_sku,quantity,unit_price)`).eq("competence_id", competenceId).eq("approval_status", "aprovado").eq("payment_status", "pago").neq("fulfillment_status", "cancelado").not("customer_id", "is", null).order("order_date");
    if (error) throw internalError("Falha ao carregar pedidos pagos da competencia");
    return (data ?? []) as unknown as OrderRow[];
  }

  private async getEligibleCustomerOrders(competenceId: string, customerId: string, currentIssueId?: string) {
    const orders = (await this.listPaidOrders(competenceId)).filter((order) => order.customer_id === customerId);
    const ids = orders.map((order) => order.id);
    if (ids.length === 0) return [];
    const [individualResult, monthlyResult] = await Promise.all([
      this.supabase.from("bling_nfe_issues").select("order_id,bling_nfe_id").in("order_id", ids),
      this.supabase.from("bling_monthly_nfe_issue_orders").select("order_id,issue_id").in("order_id", ids),
    ]);
    if (individualResult.error || monthlyResult.error) {
      throw internalError("Falha ao verificar faturamento anterior dos pedidos");
    }
    const individual = individualResult.data;
    const monthlyLinks = monthlyResult.data;
    const blocked = new Set((individual ?? []).map((row) => row.order_id));
    for (const link of monthlyLinks ?? []) if (link.issue_id !== currentIssueId) blocked.add(link.order_id);
    return orders.filter((order) => !blocked.has(order.id));
  }

  private async getIssue(competenceId: string, customerId: string) {
    const { data, error } = await this.supabase.from("bling_monthly_nfe_issues").select(ISSUE_SELECT).eq("competence_id", competenceId).eq("customer_id", customerId).maybeSingle();
    if (error) throw internalError("Falha ao carregar NF-e mensal");
    return data as IssueRow | null;
  }

  private async getIssueById(id: string) {
    const { data, error } = await this.supabase.from("bling_monthly_nfe_issues").select(ISSUE_SELECT).eq("id", id).maybeSingle();
    if (error) throw internalError("Falha ao carregar NF-e mensal");
    if (!data) throw notFound("NF-e mensal nao encontrada");
    return data as IssueRow;
  }

  private async insertDraft(input: z.infer<typeof createMonthlyNfeSchema>, payload: BlingNfeCreatePayload) {
    const { data, error } = await this.supabase.from("bling_monthly_nfe_issues").insert({ competence_id: input.competenceId, customer_id: input.customerId, created_by: this.actorId ?? null, request_payload: payload, status: "draft" }).select(ISSUE_SELECT).single();
    if (error) throw conflict("Ja existe uma NF-e mensal para este cliente e competencia");
    return data as IssueRow;
  }

  private async linkOrders(issueId: string, orderIds: string[]) {
    const { error } = await this.supabase.from("bling_monthly_nfe_issue_orders").upsert(orderIds.map((orderId) => ({ issue_id: issueId, order_id: orderId })), { onConflict: "issue_id,order_id" });
    if (error) throw conflict("Um dos pedidos ja pertence a outra NF-e mensal");
  }

  private async updateIssue(id: string, values: Record<string, unknown>) {
    const { data, error } = await this.supabase.from("bling_monthly_nfe_issues").update(values).eq("id", id).select(ISSUE_SELECT).single();
    if (error) throw internalError("Falha ao atualizar NF-e mensal");
    return mapIssue(data as IssueRow);
  }
}
