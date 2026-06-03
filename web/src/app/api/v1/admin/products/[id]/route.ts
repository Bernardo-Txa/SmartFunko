import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { ProductService, updateProductSchema } from "@/server/products/product-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const product = await new ProductService(undefined, admin.profile.id).getProductById(id);
    return jsonOk(product);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateProductSchema);
    const product = await new ProductService(undefined, admin.profile.id).updateProduct(id, input);
    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-options", "max");
    return jsonOk(product);
  });
}
