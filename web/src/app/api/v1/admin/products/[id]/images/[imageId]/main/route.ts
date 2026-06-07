import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { ProductService } from "@/server/products/product-service";

type Params = {
  params: Promise<{ id: string; imageId: string }>;
};

type ProductImageMainResponse = {
  id: string;
  main_image_url: string | null;
};

export async function PATCH(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id, imageId } = await params;
    const admin = await requireAdmin();
    const product = (await new ProductService(undefined, admin.profile.id).setMainProductImage(
      id,
      imageId,
    )) as unknown as ProductImageMainResponse;

    revalidateTag("catalog-products", "max");

    return jsonOk({
      product: {
        id: product.id,
        mainImageUrl: product.main_image_url,
      },
    });
  });
}
