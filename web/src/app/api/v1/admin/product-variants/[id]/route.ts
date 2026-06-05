import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { ProductService, updateProductVariantSchema } from "@/server/products/product-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateProductVariantSchema);
    const variant = await new ProductService(undefined, admin.profile.id).updateProductVariant(id, input);
    revalidateTag("catalog-products", "max");
    return jsonOk(variant);
  });
}
