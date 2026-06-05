import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createSupplierSchema, SupplierService } from "@/server/suppliers/supplier-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const suppliers = await new SupplierService(undefined, admin.profile.id).listSuppliers();
    return jsonOk(suppliers);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createSupplierSchema);
    const supplier = await new SupplierService(undefined, admin.profile.id).createSupplier(input);
    revalidateTag("catalog-options", "max");
    return jsonCreated(supplier);
  });
}
