import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { RareCollectibleService } from "@/server/rare-collectibles/rare-collectible-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const item = await new RareCollectibleService(undefined, admin.profile.id).archiveRareCollectible(id);

    return jsonOk(item);
  });
}
