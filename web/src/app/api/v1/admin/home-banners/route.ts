import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import {
  createHomeBannerSchema,
  HomeBannerService,
  homeBannerStatusSchema,
} from "@/server/home-banners/home-banner-service";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const searchParams = new URL(request.url).searchParams;
    const statusParam = searchParams.get("status") ?? "all";
    const status = statusParam === "all" ? "all" : homeBannerStatusSchema.parse(statusParam);
    const banners = await new HomeBannerService(undefined, admin.profile.id).listAdminHomeBanners(status);

    return jsonOk(banners);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createHomeBannerSchema);
    const banner = await new HomeBannerService(undefined, admin.profile.id).createHomeBanner(input);

    return jsonCreated(banner);
  });
}
