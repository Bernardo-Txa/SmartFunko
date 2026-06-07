import { requireOwner } from "@/server/auth/require-owner";
import { CashflowService } from "@/server/cashflow/cashflow-service";
import { handleApi, jsonOk } from "@/server/http/responses";

export async function GET(request: Request) {
  return handleApi(async () => {
    const owner = await requireOwner();
    const url = new URL(request.url);
    const entries = await new CashflowService(undefined, owner.profile.id).listCashEntries({
      category: url.searchParams.get("category") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
      startDate: url.searchParams.get("startDate") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });
    return jsonOk(entries);
  });
}
