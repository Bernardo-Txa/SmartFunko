import { requireAdmin } from "@/server/auth/require-admin";
import { CustomerService, updateCustomerSchema } from "@/server/customers/customer-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const customer = await new CustomerService(undefined, admin.profile.id).getCustomerById(id);
    return jsonOk(customer);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateCustomerSchema);
    const customer = await new CustomerService(undefined, admin.profile.id).updateCustomer(id, input);
    return jsonOk(customer);
  });
}
