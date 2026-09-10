import { requireAdmin } from "@/server/auth/require-admin";
import { BlingNfeService, sendBlingNfeIssueSchema } from "@/server/bling/bling-nfe-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, sendBlingNfeIssueSchema);
    const issue = await new BlingNfeService(undefined, admin.profile.id).sendOrderIssue(id, input);

    return jsonOk(issue);
  });
}
