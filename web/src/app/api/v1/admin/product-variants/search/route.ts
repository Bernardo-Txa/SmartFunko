import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { ProductService } from "@/server/products/product-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const variants = await new ProductService(undefined, admin.profile.id).searchAdminProductVariants({
      limit: Number(searchParams.get("limit") ?? 20),
      search: searchParams.get("q") ?? "",
    });

    return jsonOk(variants);
  });
}
