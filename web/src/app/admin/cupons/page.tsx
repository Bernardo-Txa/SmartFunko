import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { CouponAdminPanel, type DiscountCouponRow } from "@/components/admin/coupon-admin-panel";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { DiscountCouponService } from "@/server/coupons/discount-coupon-service";

export const metadata: Metadata = {
  title: "Cupons admin",
};

export default async function AdminCouponsPage() {
  const admin = await requireAdminPage("/admin/cupons");
  const coupons = await new DiscountCouponService(undefined, admin.profile.id).listCoupons();

  return (
    <AdminShell title="Cupons" description="Criação e controle de descontos aplicados no carrinho assistido.">
      <CouponAdminPanel coupons={coupons as DiscountCouponRow[]} />
    </AdminShell>
  );
}
