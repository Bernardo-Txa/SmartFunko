import { requireAdmin } from "@/server/auth/require-admin";
import { BlingNfeService, createBlingNfeIssueSchema } from "@/server/bling/bling-nfe-service";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createBlingNfeIssueSchema);
    const issue = await new BlingNfeService(undefined, admin.profile.id).createOrderIssue(id, input);

    return jsonCreated(issue);
  });
}
