import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import {
  createRareCollectibleSchema,
  RareCollectibleService,
  type RareCollectibleStatus,
} from "@/server/rare-collectibles/rare-collectible-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const searchParams = new URL(request.url).searchParams;
    const status = (searchParams.get("status") ?? "all") as RareCollectibleStatus | "all";
    const items = await new RareCollectibleService(undefined, admin.profile.id).listAdminRareCollectibles({
      category: searchParams.get("category") ?? undefined,
      query: searchParams.get("q") ?? undefined,
      sort: (searchParams.get("sort") ?? "featured") as "featured" | "newest" | "price_asc" | "price_desc",
      status,
    });

    return jsonOk(items);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createRareCollectibleSchema);
    const item = await new RareCollectibleService(undefined, admin.profile.id).createRareCollectible(input);

    return jsonCreated(item);
  });
}
