"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { clsx } from "clsx";
import {
  addWishlistProduct,
  getCachedWishlistItem,
  loadWishlist,
  removeWishlistProduct,
  subscribeWishlist,
} from "@/lib/client/wishlist-client";

function loginHref() {
  const current = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(current)}`;
}

export function WishlistButton({
  className,
  label = "Favoritar",
  productId,
  productName,
  showLabel = false,
}: {
  className?: string;
  label?: string;
  productId: string;
  productName: string;
  showLabel?: boolean;
}) {
  const [itemId, setItemId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCustomerLinked, setIsCustomerLinked] = useState<boolean>(true);
  const [isPending, setIsPending] = useState<boolean>(false);
  const isActive = Boolean(itemId);

  const ariaLabel = useMemo(
    () => (isActive ? `Remover ${productName} dos favoritos` : `Adicionar ${productName} aos favoritos`),
    [isActive, productName],
  );

  useEffect(() => {
    let isMounted = true;

    loadWishlist().then((wishlist) => {
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(wishlist.isAuthenticated);
      setIsCustomerLinked(wishlist.isCustomerLinked);
      setItemId(wishlist.items.find((item) => item.product_id === productId)?.id ?? null);
    });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  useEffect(
    () =>
      subscribeWishlist(() => {
        setItemId(getCachedWishlistItem(productId)?.id ?? null);
      }),
    [productId],
  );

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={async () => {
        if (isPending) {
          return;
        }

        if (isAuthenticated === false) {
          window.location.href = loginHref();
          return;
        }

        if (!isCustomerLinked) {
          window.alert("Seu login ainda não tem um cadastro de cliente vinculado para usar favoritos.");
          return;
        }

        setIsPending(true);

        try {
          if (itemId) {
            const result = await removeWishlistProduct(itemId);

            if (!result.isAuthenticated) {
              window.location.href = loginHref();
              return;
            }

            if (!result.isCustomerLinked) {
              setIsCustomerLinked(false);
              const errorMessage = "errorMessage" in result ? result.errorMessage : undefined;
              window.alert(
                errorMessage ??
                  "Seu login ainda não tem um cadastro de cliente vinculado para usar favoritos.",
              );
              return;
            }

            setItemId(null);
          } else {
            const result = await addWishlistProduct(productId);

            if (!result.isAuthenticated) {
              window.location.href = loginHref();
              return;
            }

            if (!result.isCustomerLinked || !result.item) {
              setIsCustomerLinked(false);
              const errorMessage = "errorMessage" in result ? result.errorMessage : undefined;
              window.alert(
                errorMessage ??
                  "Seu login ainda não tem um cadastro de cliente vinculado para usar favoritos.",
              );
              return;
            }

            setItemId(result.item.id);
            setIsAuthenticated(true);
            setIsCustomerLinked(true);
          }
        } finally {
          setIsPending(false);
        }
      }}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-black transition disabled:cursor-wait disabled:opacity-70",
        isActive
          ? "border-pink-300/60 bg-pink-500/18 text-pink-100"
          : "border-cyan-300/24 bg-slate-950/60 text-slate-200 hover:bg-cyan-400/12",
        className,
      )}
    >
      <Heart
        size={16}
        aria-hidden="true"
        className={isActive ? "fill-current" : undefined}
      />
      {showLabel ? <span>{isActive ? "Favorito" : label}</span> : null}
    </button>
  );
}
