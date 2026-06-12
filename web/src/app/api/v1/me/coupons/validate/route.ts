import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import {
  DiscountCouponService,
  validateCartCouponSchema,
} from "@/server/coupons/discount-coupon-service";
import { handleApi, jsonOk } from "@/server/http/responses";
import { parseJsonBody } from "@/server/validation/parse-json";

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { customer } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, validateCartCouponSchema);
    const coupon = await new DiscountCouponService().validateCartCoupon(input);
    return jsonOk(coupon);
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
