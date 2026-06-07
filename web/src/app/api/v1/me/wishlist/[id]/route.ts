import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonNoContent, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";
import { WishlistService, wishlistUpdateSchema } from "@/server/wishlist/wishlist-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    await new WishlistService().deleteWishlistItem(customer.id, id);
    return jsonNoContent();
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, wishlistUpdateSchema);
    const item = await new WishlistService().updateWishlistItem(customer.id, id, input);
    return jsonOk(item);
  });
}
