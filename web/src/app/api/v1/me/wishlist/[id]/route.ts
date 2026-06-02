import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonNoContent } from "@/server/http/responses";
import { WishlistService } from "@/server/wishlist/wishlist-service";

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
