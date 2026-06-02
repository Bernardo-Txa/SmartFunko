import { requireAdmin } from "@/server/auth/require-admin";
import { CustomerService, createCustomerSchema } from "@/server/customers/customer-service";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const customers = await new CustomerService(undefined, admin.profile.id).listCustomers();
    return jsonOk(customers);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createCustomerSchema);
    const customer = await new CustomerService(undefined, admin.profile.id).createCustomer(input);
    return jsonCreated(customer);
  });
}
