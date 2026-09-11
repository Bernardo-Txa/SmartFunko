import "server-only";
import { env } from "@/lib/env";
import { internalError } from "@/server/http/errors";
import { canRefreshBlingAccessToken, getBlingAccessToken } from "@/server/bling/bling-token-service";

export type BlingNfeCreatePayload = {
  contato: {
    contribuinte: number;
    email?: string;
    nome: string;
    numeroDocumento: string;
    telefone?: string;
    tipoPessoa: "F" | "J" | "E";
  };
  dataOperacao: string;
  desconto?: number;
  finalidade: number;
  itens: Array<{
    classificacaoFiscal?: string;
    codigo: string;
    descricao: string;
    origem?: number;
    quantidade: number;
    tipo: "P" | "S";
    unidade: string;
    valor: number;
  }>;
  loja?: {
    id?: number;
    numero?: string;
  };
  naturezaOperacao: {
    id: number;
  };
  numero: string;
  observacoes?: string;
  parcelas?: Array<{
    data: string;
    formaPagamento?: {
      id: number;
    };
    observacoes?: string;
    valor: number;
  }>;
  tipo: number;
};

export type BlingNfeData = {
  chaveAcesso?: string;
  dataEmissao?: string;
  id?: number | string;
  linkDanfe?: string;
  linkPDF?: string;
  linkXml?: string;
  numero?: number | string;
  numeroPedidoLoja?: string;
  serie?: number | string;
  situacao?: number | string | { id?: number | string; valor?: number | string };
  valorNota?: number | string;
  xml?: string;
};

export type BlingEnvelope<T> = {
  data?: T;
};

export class BlingApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "BlingApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function fieldMessage(field: unknown): string | null {
  if (!isRecord(field)) {
    return null;
  }

  const base = firstString(field.msg, field.message, field.description);
  const element = firstString(field.element, field.namespace);
  const nested: string = Array.isArray(field.collection)
    ? field.collection.map(fieldMessage).filter(Boolean).join("; ")
    : "";

  return [element, base, nested].filter(Boolean).join(": ") || null;
}

function formatBlingError(status: number, body: unknown) {
  if (!isRecord(body)) {
    return status === 401
      ? "Bling nao autorizou a chamada. Reautorize o Bling pelo painel administrativo."
      : "Bling retornou erro sem detalhes.";
  }

  const error = isRecord(body.error) ? body.error : {};
  const errorType = firstString(error.type, body.type);
  const message = firstString(error.message, body.message);
  const description = firstString(error.description, body.error_description, body.description);
  const fields = Array.isArray(error.fields)
    ? error.fields.map(fieldMessage).filter(Boolean).join("; ")
    : "";
  const formatted = [message, description, fields].filter(Boolean).join(" - ");

  if (errorType === "insufficient_scope") {
    return [
      "Token Bling sem escopo suficiente",
      "adicione os escopos de Notas Fiscais no aplicativo, salve e reautorize o Bling pelo painel administrativo",
      description,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  if (formatted) {
    return formatted;
  }

  if (status === 401) {
    return "Bling nao autorizou a chamada. Reautorize o Bling pelo painel administrativo.";
  }

  if (status === 429) {
    return "Limite de requisicoes da API Bling atingido. Aguarde alguns instantes e tente novamente.";
  }

  return `Bling retornou HTTP ${status}.`;
}

function blingUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const baseUrl = env.blingApiBaseUrl.replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function blingFetch<T>(
  path: string,
  init: {
    body?: unknown;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
) {
  if (!env.blingApiBaseUrl) {
    throw internalError("Configure BLING_API_BASE_URL antes de consultar o Bling");
  }

  if (!env.blingNfeNaturezaOperacaoId) {
    throw internalError("Configure BLING_NFE_NATUREZA_OPERACAO_ID antes de emitir NF-e");
  }

  async function request(accessToken: string) {
    let response: Response;

    try {
      response = await fetch(blingUrl(path, init.query), {
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "enable-jwt": "1",
        },
        method: init.method ?? "GET",
        signal: AbortSignal.timeout(25_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw internalError("Timeout ao chamar a API Bling");
      }

      throw error;
    }

    return {
      body: await parseBody(response),
      response,
    };
  }

  const accessToken = await getBlingAccessToken();
  let { body, response } = await request(accessToken);

  if (response.status === 401 && canRefreshBlingAccessToken()) {
    const refreshedAccessToken = await getBlingAccessToken({ forceRefresh: true });
    ({ body, response } = await request(refreshedAccessToken));
  }

  if (!response.ok) {
    throw new BlingApiError(formatBlingError(response.status, body), response.status, body);
  }

  return body as T;
}

export async function createBlingNfe(payload: BlingNfeCreatePayload) {
  return blingFetch<BlingEnvelope<BlingNfeData>>("/nfe", {
    body: payload,
    method: "POST",
  });
}

export async function getBlingNfe(idNotaFiscal: string) {
  return blingFetch<BlingEnvelope<BlingNfeData>>(`/nfe/${encodeURIComponent(idNotaFiscal)}`);
}

export async function listBlingNfes(
  query: {
    limite?: number;
    pagina?: number;
    serie?: number | string;
    tipo?: number | string;
  } = {},
) {
  return blingFetch<BlingEnvelope<BlingNfeData[]>>("/nfe", {
    query,
  });
}

export async function sendBlingNfe(idNotaFiscal: string, enviarEmail = false) {
  return blingFetch<BlingEnvelope<{ xml?: string }>>(`/nfe/${encodeURIComponent(idNotaFiscal)}/enviar`, {
    method: "POST",
    query: {
      enviarEmail,
    },
  });
}
