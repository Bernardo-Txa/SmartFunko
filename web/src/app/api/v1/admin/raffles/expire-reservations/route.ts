import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";

export async function POST() {
  return handleApi(async () => {
    assertRafflesEnabled();
    const admin = await requireAdmin();
    const expired = await new RaffleService(undefined, admin.profile.id).expireRaffleReservations();
    return jsonOk({ expired });
  });
}
