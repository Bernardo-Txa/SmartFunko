import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createProductSchema, ProductService } from "@/server/products/product-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const products = await new ProductService(undefined, admin.profile.id).listAdminProducts({
      limit: Number(searchParams.get("limit") ?? 150),
      page: Number(searchParams.get("page") ?? 1),
      search: searchParams.get("q") ?? undefined,
    });
    return jsonOk(products);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createProductSchema);
    const product = await new ProductService(undefined, admin.profile.id).createProduct(input);
    return jsonCreated(product);
  });
}
