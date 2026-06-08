"use client";

import { CartButton } from "@/components/storefront/cart-button";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import type { CartProduct } from "@/lib/client/cart-client";

export function ProductCardActions({
  cartProduct,
  productId,
  productName,
}: {
  cartProduct: CartProduct;
  productId: string;
  productName: string;
}) {
  return (
    <div className="absolute left-3 top-3 z-20 flex gap-2">
      <WishlistButton
        className="h-9 w-9 bg-slate-950/72 px-0 backdrop-blur"
        productId={productId}
        productName={productName}
      />
      <CartButton
        className="h-9 w-9 bg-slate-950/72 px-0 backdrop-blur"
        product={cartProduct}
        showLabel={false}
      />
    </div>
  );
}
