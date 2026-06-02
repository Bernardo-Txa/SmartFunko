import { requireAdmin } from "@/server/auth/require-admin";
import { DashboardService } from "@/server/dashboard/dashboard-service";
import { handleApi, jsonOk } from "@/server/http/responses";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const dashboard = await new DashboardService().getAdminDashboard();
    return jsonOk(dashboard);
  });
}
