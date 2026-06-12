import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonNoContent, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";
import { WishlistService, wishlistUpdateSchema } from "@/server/wishlist/wishlist-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  return withCors(request, await handleApi(async () => {
    const { id } = await params;
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    await new WishlistService().deleteWishlistItem(customer.id, id);
    return jsonNoContent();
  }));
}

export async function PATCH(request: Request, { params }: Params) {
  return withCors(request, await handleApi(async () => {
    const { id } = await params;
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, wishlistUpdateSchema);
    const item = await new WishlistService().updateWishlistItem(customer.id, id, input);
    return jsonOk(item);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
