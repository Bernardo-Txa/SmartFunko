import { requireAdmin } from "@/server/auth/require-admin";
import { BlingMonthlyNfeService } from "@/server/bling/bling-monthly-nfe-service";
import { handleApi, jsonOk } from "@/server/http/responses";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireAdmin();
    const { id } = await params;
    return jsonOk(await new BlingMonthlyNfeService().syncIssue(id));
  });
}
