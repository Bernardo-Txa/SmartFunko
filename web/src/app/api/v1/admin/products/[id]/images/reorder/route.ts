import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { ProductService, type ProductImageRow } from "@/server/products/product-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()),
});

function toImageResponse(image: ProductImageRow) {
  return {
    id: image.id,
    imageUrl: image.image_url,
    productId: image.product_id,
    sortOrder: image.sort_order,
  };
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, reorderImagesSchema);
    const images = await new ProductService(undefined, admin.profile.id).reorderProductImages(
      id,
      input.imageIds,
    );

    revalidateTag("catalog-products", "max");

    return jsonOk({
      images: images.map(toImageResponse),
    });
  });
}
