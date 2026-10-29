import { requireAdmin } from "@/server/auth/require-admin";
import { BlingMonthlyNfeService, createMonthlyNfeSchema } from "@/server/bling/bling-monthly-nfe-service";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createMonthlyNfeSchema);
    const issue = await new BlingMonthlyNfeService(undefined, admin.profile.id).createIssue(input);
    return jsonCreated(issue);
  });
}
