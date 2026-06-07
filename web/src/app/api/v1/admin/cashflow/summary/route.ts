import { requireOwner } from "@/server/auth/require-owner";
import { CashflowService } from "@/server/cashflow/cashflow-service";
import { handleApi, jsonOk } from "@/server/http/responses";

export async function GET(request: Request) {
  return handleApi(async () => {
    const owner = await requireOwner();
    const url = new URL(request.url);
    const summary = await new CashflowService(undefined, owner.profile.id).getCashflowSummary({
      category: url.searchParams.get("category") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      startDate: url.searchParams.get("startDate") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });
    return jsonOk(summary);
  });
}
