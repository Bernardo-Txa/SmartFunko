import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { idempotencyFingerprint, requireIdempotencyKey } from "@/server/http/idempotency";
import { createMobileOrderV2Schema, mobileIdempotencyKeySchema, toMobileOrderV2Dto } from "@/server/mobile/orders-v2-mobile-contract";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { decodeMobileOrderCursor, encodeMobileOrderCursor, mobileOrderPageLimitSchema } from "@/server/mobile/mobile-pagination";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);
    if (!customer) throw forbidden("Cliente nao vinculado ao usuario");
    const url = new URL(request.url);
    const limit = mobileOrderPageLimitSchema.parse(url.searchParams.get("limit") ?? undefined);
    const cursor = decodeMobileOrderCursor(url.searchParams.get("cursor"));
    const page = await new OrderV2Service().getMobileCustomerOrdersPage(customer.id, limit, cursor);
    const last = page.items.at(-1) as { created_at?: string; id?: string } | undefined;
    return jsonOk({
      items: page.items.map(toMobileOrderV2Dto),
      nextCursor: page.hasMore && last?.created_at && last.id
        ? encodeMobileOrderCursor({ createdAt: last.created_at, id: last.id })
        : null,
    });
  }));
}

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer, profile } = await requireUser(request);
    if (!customer) throw forbidden("Cliente nao vinculado ao usuario");
    const key = requireIdempotencyKey(request, (value) => mobileIdempotencyKeySchema.parse(value));
    const input = await parseJsonBody(request, createMobileOrderV2Schema);
    const order = await new OrderV2Service().createMobileCustomerSiteOrderFromCart(
      customer.id, input, profile.id, key, idempotencyFingerprint(input),
    );
    return jsonCreated(toMobileOrderV2Dto(order));
  }));
}

export function OPTIONS(request: Request) { return corsPreflightResponse(request); }
