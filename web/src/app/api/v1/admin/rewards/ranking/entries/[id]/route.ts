import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RewardsService, updateRankingEntrySchema } from "@/server/rewards/rewards-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateRankingEntrySchema);
    const entry = await new RewardsService(undefined, admin.profile.id).updateRankingEntry(id, input);
    return jsonOk(entry);
  });
}
