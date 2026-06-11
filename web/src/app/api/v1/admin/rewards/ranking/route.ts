import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RewardsService, updateRankingSchema } from "@/server/rewards/rewards-service";
import { parseJsonBody } from "@/server/validation/parse-json";

function getPeriod(request: Request) {
  const params = new URL(request.url).searchParams;
  const now = new Date();
  return {
    month: Number(params.get("month") ?? now.getUTCMonth() + 1),
    year: Number(params.get("year") ?? now.getUTCFullYear()),
  };
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { month, year } = getPeriod(request);
    const ranking = await new RewardsService(undefined, admin.profile.id).getRanking(year, month);
    return jsonOk(ranking);
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { month, year } = getPeriod(request);
    const input = await parseJsonBody(request, updateRankingSchema);
    const ranking = await new RewardsService(undefined, admin.profile.id).updateRanking(year, month, input);
    return jsonOk(ranking);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { month, year } = getPeriod(request);
    const ranking = await new RewardsService(undefined, admin.profile.id).recalculateMonthlyRanking(year, month);
    return jsonOk(ranking);
  });
}
