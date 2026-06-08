import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function POST() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const expired = await new RaffleService(undefined, admin.profile.id).expireRaffleReservations();
    return jsonOk({ expired });
  });
}
