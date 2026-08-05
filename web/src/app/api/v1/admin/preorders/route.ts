import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createPreorderItemSchema, PreorderService } from "@/server/preorders/preorder-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const searchParams = new URL(request.url).searchParams;
    const admin = await requireAdmin();
    const items = await new PreorderService(undefined, admin.profile.id).listAdminPreorderItems({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    return jsonOk(items);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createPreorderItemSchema);
    const item = await new PreorderService(undefined, admin.profile.id).createPreorderItem(input);

    return jsonCreated(item);
  });
}
