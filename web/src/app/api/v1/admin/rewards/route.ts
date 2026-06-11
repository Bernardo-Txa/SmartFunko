import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RewardsService } from "@/server/rewards/rewards-service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const now = new Date();
    const year = Number(params.get("year") ?? now.getUTCFullYear());
    const month = Number(params.get("month") ?? now.getUTCMonth() + 1);
    const dashboard = await new RewardsService(undefined, admin.profile.id).getAdminDashboard(year, month);
    return jsonOk(dashboard);
  });
}
