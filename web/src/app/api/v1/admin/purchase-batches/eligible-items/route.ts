import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { PurchaseBatchService } from "@/server/purchase-batches/purchase-batch-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const items = await new PurchaseBatchService(undefined, admin.profile.id).listEligibleOrderItems({
      customerId: searchParams.get("customerId") ?? undefined,
      orderFinancialStatus: searchParams.get("orderFinancialStatus") ?? undefined,
      orderId: searchParams.get("orderId") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      productVariantId: searchParams.get("productVariantId") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
    });
    return jsonOk(items);
  });
}
