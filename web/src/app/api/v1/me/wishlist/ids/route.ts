import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { WishlistService } from "@/server/wishlist/wishlist-service";

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const wishlist = await new WishlistService().listWishlistIds(customer.id);
    return jsonOk(wishlist);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
