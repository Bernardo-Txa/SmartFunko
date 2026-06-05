import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { SupplierService, updateSupplierSchema } from "@/server/suppliers/supplier-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const supplier = await new SupplierService(undefined, admin.profile.id).getSupplierById(id);
    return jsonOk(supplier);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateSupplierSchema);
    const supplier = await new SupplierService(undefined, admin.profile.id).updateSupplier(id, input);
    revalidateTag("catalog-options", "max");
    revalidateTag("catalog-products", "max");
    return jsonOk(supplier);
  });
}
