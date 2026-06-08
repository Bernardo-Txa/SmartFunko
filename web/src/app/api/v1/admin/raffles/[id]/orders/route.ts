import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RaffleService } from "@/server/raffles/raffle-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const orders = await new RaffleService(undefined, admin.profile.id).listRaffleOrders(id, {
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return jsonOk(orders);
  });
}
