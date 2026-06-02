import { ZodError } from "zod";
import { HttpError } from "@/server/http/errors";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, init);
}

export function jsonCreated<T>(data: T) {
  return jsonOk(data, { status: 201 });
}

export function jsonNoContent() {
  return new Response(null, { status: 204 });
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "validation_error",
          message: "Payload invalido",
          details: error.issues,
        },
      },
      { status: 400 },
    );
  }

  console.error("Unhandled API error", error);

  return Response.json(
    {
      error: {
        code: "internal_error",
        message: "Erro interno",
      },
    },
    { status: 500 },
  );
}

export async function handleApi(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return jsonError(error);
  }
}
