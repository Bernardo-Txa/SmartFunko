import { requireAdmin } from "@/server/auth/require-admin";
import { BlingMonthlyNfeService, monthlyNfeActionSchema } from "@/server/bling/bling-monthly-nfe-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireAdmin();
    const { id } = await params;
    const input = await parseJsonBody(request, monthlyNfeActionSchema);
    return jsonOk(await new BlingMonthlyNfeService().sendIssue(id, input.enviarEmail));
  });
}
