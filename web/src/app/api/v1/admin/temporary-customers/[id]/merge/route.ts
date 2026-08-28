import { requireAdmin } from "@/server/auth/require-admin";
import {
  mergeTemporaryCustomerSchema,
  TemporaryCustomerService,
} from "@/server/customers/temporary-customer-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, mergeTemporaryCustomerSchema);
    const result = await new TemporaryCustomerService(undefined, admin.profile.id).mergeTemporaryCustomer(id, input);
    return jsonOk(result);
  });
}
