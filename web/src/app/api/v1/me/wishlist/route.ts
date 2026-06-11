import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";
import { WishlistService, wishlistCreateSchema } from "@/server/wishlist/wishlist-service";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const wishlist = await new WishlistService().listWishlist(customer.id);
    return jsonOk(wishlist);
  }));
}

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, wishlistCreateSchema);
    const item = await new WishlistService().addWishlistItem(customer.id, input);
    return jsonCreated(item);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
