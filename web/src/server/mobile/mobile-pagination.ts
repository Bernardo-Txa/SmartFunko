import { z } from "zod";

const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});
export type MobileOrderCursor = z.infer<typeof cursorPayloadSchema>;

export function encodeMobileOrderCursor(cursor: MobileOrderCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeMobileOrderCursor(value: string | null) {
  if (!value) return null;
  return cursorPayloadSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
}

export const mobileOrderPageLimitSchema = z.coerce.number().int().min(1).max(50).default(20);
