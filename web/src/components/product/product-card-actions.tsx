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
        className="h-9 w-9 border-white/70 bg-white/78 px-0 text-slate-950 shadow-[0_6px_16px_rgba(2,6,23,0.22)] backdrop-blur hover:bg-white/92 hover:text-pink-700"
        productId={productId}
        productName={productName}
      />
      <CartButton
        className="h-9 w-9 border-white/70 bg-white/78 px-0 text-slate-950 shadow-[0_6px_16px_rgba(2,6,23,0.22)] backdrop-blur hover:bg-white/92 hover:text-cyan-700"
        product={cartProduct}
        showLabel={false}
      />
    </div>
  );
}
