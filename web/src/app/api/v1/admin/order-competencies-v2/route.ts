import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createV2OrderCompetenceSchema, OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const competencies = await new OrderV2Service(undefined, admin.profile.id).listCompetencies();
    return jsonOk(competencies);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createV2OrderCompetenceSchema);
    const competence = await new OrderV2Service(undefined, admin.profile.id).createCompetence(input);
    return jsonCreated(competence);
  });
}
