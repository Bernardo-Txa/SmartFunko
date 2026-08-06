import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonNoContent, jsonOk } from "@/server/http/responses";
import { PreorderService, updatePreorderItemSchema } from "@/server/preorders/preorder-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = await parseJsonBody(request, updatePreorderItemSchema);
    const item = await new PreorderService(undefined, admin.profile.id).updatePreorderItem(id, input);

    return jsonOk(item);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    await new PreorderService(undefined, admin.profile.id).deletePreorderItem(id);

    return jsonNoContent();
  });
}
