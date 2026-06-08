"use client";

import { CartButton } from "@/components/storefront/cart-button";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import type { CartProduct } from "@/lib/client/cart-client";

export function ProductQuickActions({
  cartProduct,
  productId,
  productName,
}: {
  cartProduct: CartProduct;
  productId: string;
  productName: string;
}) {
  return (
    <div className="absolute right-4 top-4 z-30 flex flex-col gap-2">
      <WishlistButton
        productId={productId}
        productName={productName}
        showLabel={false}
        variant="quick"
      />
      <CartButton product={cartProduct} showLabel={false} variant="quick" />
    </div>
  );
}
