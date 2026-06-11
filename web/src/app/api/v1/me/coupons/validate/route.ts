import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import {
  DiscountCouponService,
  validateCartCouponSchema,
} from "@/server/coupons/discount-coupon-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, validateCartCouponSchema);
    const coupon = await new DiscountCouponService().validateCartCoupon(input);
    return jsonOk(coupon);
  });
}
