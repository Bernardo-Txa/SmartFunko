import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { ProductService, quickCreateProductSchema } from "@/server/products/product-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, quickCreateProductSchema);
    const created = await new ProductService(undefined, admin.profile.id).quickCreateProduct(input);

    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-options", "max");

    return jsonCreated(created);
  });
}
