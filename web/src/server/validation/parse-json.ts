import type { z } from "zod";
import { badRequest } from "@/server/http/errors";

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw badRequest("Corpo JSON invalido");
  }

  return schema.parse(body);
}
