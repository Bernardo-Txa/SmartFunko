import { requireAdmin } from "@/server/auth/require-admin";
import {
  DiscountCouponService,
  updateDiscountCouponSchema,
} from "@/server/coupons/discount-coupon-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, updateDiscountCouponSchema);
    const coupon = await new DiscountCouponService(undefined, admin.profile.id).updateCoupon(id, input);
    return jsonOk(coupon);
  });
}
