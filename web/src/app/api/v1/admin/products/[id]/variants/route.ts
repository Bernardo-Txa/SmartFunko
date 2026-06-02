import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { createProductVariantSchema, ProductService } from "@/server/products/product-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

const createVariantBodySchema = createProductVariantSchema.omit({ productId: true });

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createVariantBodySchema);
    const variant = await new ProductService(undefined, admin.profile.id).createVariant({
      ...input,
      productId: id,
    });

    return jsonCreated(variant);
  });
}
