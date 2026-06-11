import { requireAdmin } from "@/server/auth/require-admin";
import {
  createDiscountCouponSchema,
  DiscountCouponService,
} from "@/server/coupons/discount-coupon-service";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function GET() {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const coupons = await new DiscountCouponService(undefined, admin.profile.id).listCoupons();
    return jsonOk(coupons);
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, createDiscountCouponSchema);
    const coupon = await new DiscountCouponService(undefined, admin.profile.id).createCoupon(input);
    return jsonCreated(coupon);
  });
}
