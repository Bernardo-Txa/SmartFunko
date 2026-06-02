export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "http_error",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function badRequest(message = "Requisicao invalida") {
  return new HttpError(400, message, "bad_request");
}

export function unauthorized(message = "Autenticacao obrigatoria") {
  return new HttpError(401, message, "unauthorized");
}

export function forbidden(message = "Permissao insuficiente") {
  return new HttpError(403, message, "forbidden");
}

export function notFound(message = "Registro nao encontrado") {
  return new HttpError(404, message, "not_found");
}

export function conflict(message = "Conflito de regra de negocio") {
  return new HttpError(409, message, "conflict");
}

export function internalError(message = "Erro interno") {
  return new HttpError(500, message, "internal_error");
}
