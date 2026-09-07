import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonNoContent, jsonOk } from "@/server/http/responses";
import {
  HomeBannerService,
  updateHomeBannerSchema,
} from "@/server/home-banners/home-banner-service";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateHomeBannerSchema);
    const banner = await new HomeBannerService(undefined, admin.profile.id).updateHomeBanner(id, input);

    return jsonOk(banner);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    await new HomeBannerService(undefined, admin.profile.id).deleteHomeBanner(id);

    return jsonNoContent();
  });
}
