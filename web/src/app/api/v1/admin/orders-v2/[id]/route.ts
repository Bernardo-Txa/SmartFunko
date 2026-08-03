import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const order = await new OrderV2Service(undefined, admin.profile.id).getAdminOrderById(id);
    return jsonOk(order);
  });
}
