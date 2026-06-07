import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { ProductService, type ProductImageRow } from "@/server/products/product-service";

type Params = {
  params: Promise<{ id: string; imageId: string }>;
};

type ProductImageMutationResult = {
  deletedImage: ProductImageRow;
  images: ProductImageRow[];
  product: {
    id: string;
    main_image_url: string | null;
  };
};

function toImageResponse(image: ProductImageRow) {
  return {
    id: image.id,
    imageUrl: image.image_url,
    productId: image.product_id,
    sortOrder: image.sort_order,
  };
}

export async function DELETE(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id, imageId } = await params;
    const admin = await requireAdmin();
    const result = (await new ProductService(undefined, admin.profile.id).deleteProductImage(
      id,
      imageId,
    )) as unknown as ProductImageMutationResult;

    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-options", "max");

    return jsonOk({
      deletedImage: toImageResponse(result.deletedImage),
      images: result.images.map(toImageResponse),
      product: {
        id: result.product.id,
        mainImageUrl: result.product.main_image_url,
      },
    });
  });
}
