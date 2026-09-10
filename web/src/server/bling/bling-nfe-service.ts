import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { badRequest, conflict, internalError, notFound } from "@/server/http/errors";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import {
  BlingApiError,
  createBlingNfe,
  getBlingNfe,
  listBlingNfes,
  sendBlingNfe,
  type BlingEnvelope,
  type BlingNfeCreatePayload,
  type BlingNfeData,
} from "@/server/bling/bling-client";

export const createBlingNfeIssueSchema = z.object({
  numero: z.string().trim().max(9, "Informe no maximo 9 digitos").optional().default(""),
});

export const sendBlingNfeIssueSchema = z.object({
  enviarEmail: z.boolean().optional().default(false),
});

export type CreateBlingNfeIssueInput = z.infer<typeof createBlingNfeIssueSchema>;
export type SendBlingNfeIssueInput = z.infer<typeof sendBlingNfeIssueSchema>;

type BlingNfeIssueStatus = "draft" | "created" | "sent" | "authorized" | "rejected" | "cancelled" | "failed";

type BlingNfeIssueRow = {
  access_key: string | null;
  bling_nfe_id: string | null;
  bling_number: string | null;
  created_at: string;
  danfe_url: string | null;
  emitted_at: string | null;
  error_message: string | null;
  id: string;
  order_id: string;
  pdf_url: string | null;
  sent_at: string | null;
  status: BlingNfeIssueStatus;
  updated_at: string;
  xml_url: string | null;
};

type OrderCustomer = {
  cpf?: string | null;
  email?: string | null;
  id?: string;
  name?: string | null;
  phone?: string | null;
};

type OrderTemporaryCustomer = {
  id?: string;
  name?: string | null;
  phone?: string | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number | string;
  unit_price: number | string;
};

type OrderForNfe = {
  approval_status: string;
  customer_id: string | null;
  customers?: OrderCustomer | OrderCustomer[] | null;
  discount: number | string;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  paid_at: string | null;
  payment_status: string;
  temporary_customer_id: string | null;
  temporary_customers?: OrderTemporaryCustomer | OrderTemporaryCustomer[] | null;
  total: number | string;
  v2_order_items?: OrderItem[];
};

export type BlingNfeIssueView = {
  accessKey: string | null;
  blingNfeId: string | null;
  blingNumber: string | null;
  createdAt: string;
  danfeUrl: string | null;
  emittedAt: string | null;
  errorMessage: string | null;
  id: string;
  orderId: string;
  pdfUrl: string | null;
  sentAt: string | null;
  status: BlingNfeIssueStatus;
  updatedAt: string;
  xmlUrl: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function nowIso() {
  return new Date().toISOString();
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function toMoney(value: number | string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw internalError("Valor invalido para NF-e");
  }

  return Math.round(parsed * 100) / 100;
}

function parsePositiveInt(value: string, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw internalError(`Configure ${fieldName} com um numero valido`);
  }

  return parsed;
}

function parseOptionalPositiveInt(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseContribuinte() {
  const parsed = Number(env.blingNfeDefaultContribuinte);

  if ([1, 2, 9].includes(parsed)) {
    return parsed;
  }

  return 9;
}

function parseOrigem() {
  if (!env.blingNfeDefaultOrigem.trim()) {
    return undefined;
  }

  const parsed = Number(env.blingNfeDefaultOrigem);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 8 ? parsed : undefined;
}

function normalizeInvoiceNumber(value: string) {
  const numero = onlyDigits(value);

  if (!numero) {
    throw badRequest("Informe o numero da NF-e com digitos");
  }

  if (numero.length > 9) {
    throw badRequest("Numero da NF-e deve ter no maximo 9 digitos");
  }

  return numero;
}

function invoiceNumberValue(value: unknown) {
  const numero = onlyDigits(String(value ?? ""));

  if (!numero || numero.length > 9) {
    return null;
  }

  const parsed = Number(numero);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nextInvoiceNumber(values: unknown[]) {
  const maxNumber = values.reduce<number>((max, value) => Math.max(max, invoiceNumberValue(value) ?? 0), 0);
  const next = maxNumber + 1;

  if (next > 999999999) {
    throw internalError("Sequencia de NF-e ultrapassou 9 digitos");
  }

  return String(next);
}

function datePart(value: string | null | undefined) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function blingDateTime(value: string | null | undefined) {
  return `${datePart(value)} 12:00:00`;
}

function mapIssue(row: BlingNfeIssueRow): BlingNfeIssueView {
  return {
    accessKey: row.access_key,
    blingNfeId: row.bling_nfe_id,
    blingNumber: row.bling_number,
    createdAt: row.created_at,
    danfeUrl: row.danfe_url,
    emittedAt: row.emitted_at,
    errorMessage: row.error_message,
    id: row.id,
    orderId: row.order_id,
    pdfUrl: row.pdf_url,
    sentAt: row.sent_at,
    status: row.status,
    updatedAt: row.updated_at,
    xmlUrl: row.xml_url,
  };
}

function dataFromEnvelope<T>(response: BlingEnvelope<T>) {
  return response.data ?? ({} as T);
}

function stringValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function situacaoId(data: BlingNfeData) {
  if (typeof data.situacao === "object" && data.situacao !== null) {
    return Number(data.situacao.id ?? data.situacao.valor);
  }

  return Number(data.situacao);
}

function statusFromBling(data: BlingNfeData, fallback: BlingNfeIssueStatus): BlingNfeIssueStatus {
  if (data.chaveAcesso || data.linkDanfe || data.linkPDF) {
    return "authorized";
  }

  switch (situacaoId(data)) {
    case 2:
      return "cancelled";
    case 4:
    case 9:
      return "rejected";
    case 5:
    case 6:
      return "authorized";
    case 3:
    case 7:
    case 8:
    case 10:
      return "sent";
    case 11:
      return "failed";
    default:
      return fallback;
  }
}

function issueFieldsFromBling(data: BlingNfeData, fallbackStatus: BlingNfeIssueStatus) {
  return {
    access_key: stringValue(data.chaveAcesso),
    bling_nfe_id: stringValue(data.id),
    bling_number: stringValue(data.numero),
    danfe_url: stringValue(data.linkDanfe),
    pdf_url: stringValue(data.linkPDF),
    status: statusFromBling(data, fallbackStatus),
  };
}

function sanitizeResponsePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(record)) {
    if (key.toLowerCase() === "xml" && typeof nestedValue === "string") {
      next[key] = "[xml omitted]";
    } else if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      next[key] = sanitizeResponsePayload(nestedValue);
    } else {
      next[key] = nestedValue;
    }
  }

  return next;
}

function buildLoja(orderNumber: string) {
  const id = parseOptionalPositiveInt(env.blingNfeLojaId);
  const numero = env.blingNfeLojaNumero.trim() || orderNumber;

  if (!id && !env.blingNfeLojaNumero.trim()) {
    return undefined;
  }

  return {
    id,
    numero: numero || undefined,
  };
}

function buildNfePayload(order: OrderForNfe, input: CreateBlingNfeIssueInput): BlingNfeCreatePayload {
  if (order.payment_status !== "pago") {
    throw conflict("Pedido precisa estar pago antes de emitir NF-e");
  }

  if (order.fulfillment_status === "cancelado") {
    throw conflict("Pedido cancelado nao pode emitir NF-e");
  }

  if (order.temporary_customer_id) {
    throw conflict("Converta o cliente temporario em cliente cadastrado antes de emitir NF-e");
  }

  const customer = firstRelation(order.customers);

  if (!customer) {
    throw badRequest("Pedido sem cliente cadastrado para NF-e");
  }

  const documento = onlyDigits(customer.cpf);

  if (![11, 14].includes(documento.length)) {
    throw badRequest("Cadastre CPF/CNPJ valido no cliente antes de emitir NF-e");
  }

  const items = order.v2_order_items ?? [];

  if (items.length === 0) {
    throw badRequest("Pedido sem itens para NF-e");
  }

  const defaultNcm = env.blingNfeDefaultNcm.trim() || undefined;
  const origem = parseOrigem();
  const total = toMoney(order.total);
  const discount = toMoney(order.discount);
  const paymentMethodId = parseOptionalPositiveInt(env.blingNfePaymentMethodId);

  if (total <= 0) {
    throw badRequest("Pedido precisa ter total maior que zero para NF-e");
  }

  return {
    contato: {
      contribuinte: parseContribuinte(),
      email: customer.email?.trim() || undefined,
      nome: customer.name?.trim() || "Cliente SmartFunkos",
      numeroDocumento: documento,
      telefone: onlyDigits(customer.phone) || undefined,
      tipoPessoa: documento.length === 14 ? "J" : "F",
    },
    dataOperacao: blingDateTime(order.order_date),
    desconto: discount > 0 ? discount : undefined,
    finalidade: 1,
    itens: items.map((item) => {
      const quantidade = Number(item.quantity);
      const valor = toMoney(item.unit_price);
      const codigo = item.product_sku?.trim() || item.id;

      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        throw badRequest(`Item ${item.product_name} com quantidade invalida`);
      }

      if (valor < 0) {
        throw badRequest(`Item ${item.product_name} com valor invalido`);
      }

      return {
        classificacaoFiscal: defaultNcm,
        codigo,
        descricao: item.product_name.trim(),
        origem,
        quantidade,
        tipo: "P",
        unidade: "UN",
        valor,
      };
    }),
    loja: buildLoja(order.order_number),
    naturezaOperacao: {
      id: parsePositiveInt(env.blingNfeNaturezaOperacaoId, "BLING_NFE_NATUREZA_OPERACAO_ID"),
    },
    numero: normalizeInvoiceNumber(input.numero),
    observacoes: `Pedido SmartFunkos ${order.order_number}`,
    parcelas: [
      {
        data: datePart(order.paid_at ?? order.order_date),
        formaPagamento: paymentMethodId ? { id: paymentMethodId } : undefined,
        observacoes: `Pedido ${order.order_number}`,
        valor: total,
      },
    ],
    tipo: 1,
  };
}

export class BlingNfeService {
  private readonly supabase: SupabaseAdminClient;

  constructor(supabase = createSupabaseAdminClient(), private readonly actorId?: string | null) {
    this.supabase = supabase;
  }

  async getOrderIssue(orderId: string) {
    const row = await this.getOrderIssueRow(orderId);
    return row ? mapIssue(row) : null;
  }

  async createOrderIssue(orderId: string, input: CreateBlingNfeIssueInput, actorProfileId = this.actorId) {
    const existing = await this.getOrderIssueRow(orderId);

    if (existing?.bling_nfe_id) {
      throw conflict("Este pedido ja possui NF-e criada no Bling");
    }

    const order = await this.getOrderForNfe(orderId);
    const payload = buildNfePayload(order, {
      ...input,
      numero: await this.resolveInvoiceNumber(input.numero),
    });

    try {
      const response = await createBlingNfe(payload);
      const data = dataFromEnvelope(response);
      const issueFields = issueFieldsFromBling(data, "created");
      issueFields.bling_number = issueFields.bling_number ?? payload.numero;

      if (!issueFields.bling_nfe_id) {
        throw internalError("Bling criou a NF-e, mas nao retornou o ID da nota");
      }

      const issue = await this.upsertIssue({
        ...issueFields,
        created_by: actorProfileId ?? null,
        emitted_at: issueFields.status === "authorized" ? nowIso() : null,
        error_message: null,
        order_id: orderId,
        request_payload: payload,
        response_payload: sanitizeResponsePayload(response),
        sent_at: issueFields.status === "authorized" || issueFields.status === "sent" ? nowIso() : null,
      });

      await this.addOrderEvent({
        actorId: actorProfileId,
        customerId: order.customer_id,
        eventType: "bling.nfe.created",
        metadata: {
          blingNfeId: issue.blingNfeId,
          numero: issue.blingNumber,
        },
        notes: "NF-e criada no Bling",
        orderId,
        toStatus: issue.status,
      });

      return issue;
    } catch (error) {
      if (error instanceof BlingApiError) {
        await this.upsertIssue({
          bling_nfe_id: null,
          bling_number: payload.numero,
          created_by: actorProfileId ?? null,
          error_message: error.message,
          order_id: orderId,
          request_payload: payload,
          response_payload: sanitizeResponsePayload(error.body),
          status: "failed",
        });
        await this.addOrderEvent({
          actorId: actorProfileId,
          customerId: order.customer_id,
          eventType: "bling.nfe.failed",
          metadata: {
            status: error.status,
          },
          notes: error.message,
          orderId,
          toStatus: "failed",
        });
        throw badRequest(`Bling recusou a NF-e: ${error.message}`);
      }

      throw error;
    }
  }

  async sendOrderIssue(orderId: string, input: SendBlingNfeIssueInput, actorProfileId = this.actorId) {
    const order = await this.getOrderForNfe(orderId);
    const existing = await this.getOrderIssueRow(orderId);

    if (!existing?.bling_nfe_id) {
      throw conflict("Crie a NF-e no Bling antes de enviar para a Sefaz");
    }

    if (existing.status === "authorized") {
      return mapIssue(existing);
    }

    try {
      const sendResponse = await sendBlingNfe(existing.bling_nfe_id, input.enviarEmail);
      const detailsResponse = await getBlingNfe(existing.bling_nfe_id);
      const details = dataFromEnvelope(detailsResponse);
      const issueFields = issueFieldsFromBling(details, "sent");
      issueFields.bling_nfe_id = issueFields.bling_nfe_id ?? existing.bling_nfe_id;
      issueFields.bling_number = issueFields.bling_number ?? existing.bling_number;
      const status: BlingNfeIssueStatus = issueFields.status === "created" ? "sent" : issueFields.status;
      const issue = await this.updateIssue(existing.id, {
        ...issueFields,
        emitted_at: status === "authorized" ? nowIso() : existing.emitted_at,
        error_message: null,
        response_payload: sanitizeResponsePayload({
          details: detailsResponse,
          send: sendResponse,
        }),
        sent_at: existing.sent_at ?? nowIso(),
        status,
      });

      await this.addOrderEvent({
        actorId: actorProfileId,
        customerId: order.customer_id,
        eventType: "bling.nfe.sent",
        metadata: {
          blingNfeId: issue.blingNfeId,
          enviarEmail: input.enviarEmail,
          numero: issue.blingNumber,
        },
        notes: status === "authorized" ? "NF-e autorizada no Bling" : "NF-e enviada para a Sefaz pelo Bling",
        orderId,
        toStatus: status,
      });

      return issue;
    } catch (error) {
      if (error instanceof BlingApiError) {
        const issue = await this.updateIssue(existing.id, {
          error_message: error.message,
          response_payload: sanitizeResponsePayload(error.body),
          status: "failed",
        });
        await this.addOrderEvent({
          actorId: actorProfileId,
          customerId: order.customer_id,
          eventType: "bling.nfe.send_failed",
          metadata: {
            blingNfeId: issue.blingNfeId,
            status: error.status,
          },
          notes: error.message,
          orderId,
          toStatus: "failed",
        });
        throw badRequest(`Bling nao enviou a NF-e: ${error.message}`);
      }

      throw error;
    }
  }

  private async getOrderForNfe(orderId: string) {
    const { data, error } = await this.supabase
      .from("v2_orders")
      .select(`
        id,order_number,customer_id,temporary_customer_id,order_date,approval_status,payment_status,fulfillment_status,discount,total,paid_at,
        customers(id,name,email,phone,cpf,status),
        temporary_customers(id,name,phone,status,merged_customer_id),
        v2_order_items(id,product_name,product_sku,quantity,unit_price)
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw internalError("Falha ao buscar pedido para NF-e");
    }

    if (!data) {
      throw notFound("Pedido V2 nao encontrado");
    }

    return data as unknown as OrderForNfe;
  }

  private async getOrderIssueRow(orderId: string) {
    const { data, error } = await this.supabase
      .from("bling_nfe_issues")
      .select("id,order_id,status,bling_nfe_id,bling_number,access_key,danfe_url,pdf_url,xml_url,error_message,emitted_at,sent_at,created_at,updated_at")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      throw internalError("Falha ao buscar NF-e do Bling");
    }

    return (data as BlingNfeIssueRow | null) ?? null;
  }

  private async resolveInvoiceNumber(value: string | null | undefined) {
    const numero = onlyDigits(value);

    if (numero) {
      return normalizeInvoiceNumber(numero);
    }

    return this.suggestNextInvoiceNumber();
  }

  private async suggestNextInvoiceNumber() {
    try {
      const response = await listBlingNfes({
        limite: 100,
        pagina: 1,
        tipo: 1,
      });
      const nfeNumbers = Array.isArray(response.data) ? response.data.map((nfe) => nfe.numero) : [];

      if (nfeNumbers.length > 0) {
        return nextInvoiceNumber(nfeNumbers);
      }
    } catch (error) {
      if (!(error instanceof BlingApiError)) {
        throw error;
      }
    }

    const { data, error } = await this.supabase
      .from("bling_nfe_issues")
      .select("bling_number")
      .not("bling_nfe_id", "is", null)
      .not("bling_number", "is", null)
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      throw internalError("Falha ao calcular proximo numero da NF-e");
    }

    const localNumbers = ((data ?? []) as Array<Pick<BlingNfeIssueRow, "bling_number">>).map((issue) => issue.bling_number);
    return nextInvoiceNumber(localNumbers);
  }

  private async upsertIssue(values: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from("bling_nfe_issues")
      .upsert(values, { onConflict: "order_id" })
      .select("id,order_id,status,bling_nfe_id,bling_number,access_key,danfe_url,pdf_url,xml_url,error_message,emitted_at,sent_at,created_at,updated_at")
      .single();

    if (error) {
      throw internalError("Falha ao registrar NF-e do Bling");
    }

    return mapIssue(data as BlingNfeIssueRow);
  }

  private async updateIssue(issueId: string, values: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from("bling_nfe_issues")
      .update(values)
      .eq("id", issueId)
      .select("id,order_id,status,bling_nfe_id,bling_number,access_key,danfe_url,pdf_url,xml_url,error_message,emitted_at,sent_at,created_at,updated_at")
      .single();

    if (error) {
      throw internalError("Falha ao atualizar NF-e do Bling");
    }

    return mapIssue(data as BlingNfeIssueRow);
  }

  private async addOrderEvent(input: {
    actorId?: string | null;
    customerId?: string | null;
    eventType: string;
    metadata?: Record<string, unknown>;
    notes?: string | null;
    orderId: string;
    toStatus?: string | null;
  }) {
    const { error } = await this.supabase.from("v2_order_events").insert({
      actor_id: input.actorId ?? null,
      customer_id: input.customerId ?? null,
      event_type: input.eventType,
      metadata: input.metadata ?? null,
      notes: input.notes ?? null,
      order_id: input.orderId,
      to_status: input.toStatus ?? null,
    });

    if (error) {
      throw internalError("Falha ao registrar evento de NF-e");
    }
  }
}
