import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonNoContent, jsonOk } from "@/server/http/responses";
import {
  RareCollectibleService,
  updateRareCollectibleSchema,
} from "@/server/rare-collectibles/rare-collectible-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const item = await new RareCollectibleService(undefined, admin.profile.id).getAdminRareCollectibleById(id);

    return jsonOk(item);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateRareCollectibleSchema);
    const item = await new RareCollectibleService(undefined, admin.profile.id).updateRareCollectible(id, input);

    return jsonOk(item);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    await new RareCollectibleService(undefined, admin.profile.id).deleteRareCollectible(id);

    return jsonNoContent();
  });
}
