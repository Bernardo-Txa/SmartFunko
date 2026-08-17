import { requireAdmin } from "@/server/auth/require-admin";
import {
  createTemporaryCustomerSchema,
  TemporaryCustomerService,
} from "@/server/customers/temporary-customer-service";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const customers = await new TemporaryCustomerService(undefined, admin.profile.id).listTemporaryCustomers();
    return jsonOk(customers);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createTemporaryCustomerSchema);
    const customer = await new TemporaryCustomerService(undefined, admin.profile.id).createTemporaryCustomer(input);
    return jsonCreated(customer);
  });
}
