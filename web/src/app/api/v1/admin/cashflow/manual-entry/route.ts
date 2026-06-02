import { requireOwner } from "@/server/auth/require-owner";
import { CashflowService, manualCashEntrySchema } from "@/server/cashflow/cashflow-service";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    const owner = await requireOwner();
    const input = await parseJsonBody(request, manualCashEntrySchema);
    const entry = await new CashflowService(undefined, owner.profile.id).createManualCashEntry(input);
    return jsonCreated(entry);
  });
}
