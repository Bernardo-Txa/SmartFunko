import { requireOwner } from "@/server/auth/require-owner";
import { CashflowService } from "@/server/cashflow/cashflow-service";
import { handleApi, jsonOk } from "@/server/http/responses";

export async function GET() {
  return handleApi(async () => {
    const owner = await requireOwner();
    const entries = await new CashflowService(undefined, owner.profile.id).listCashEntries();
    return jsonOk(entries);
  });
}
