"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { clsx } from "clsx";
import {
  quickActionButtonBase,
  quickActionButtonIdle,
  quickActionWishlistActive,
  quickActionWishlistAuthHint,
  quickActionWishlistHover,
} from "@/components/storefront/quick-action-button-styles";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
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
  variant = "default",
}: {
  className?: string;
  label?: string;
  productId: string;
  productName: string;
  showLabel?: boolean;
  variant?: "default" | "quick";
}) {
  const [itemId, setItemId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCustomerLinked, setIsCustomerLinked] = useState<boolean>(true);
  const [isPending, setIsPending] = useState<boolean>(false);
  const isActive = Boolean(itemId);

  const ariaLabel = useMemo(
    () => {
      if (isAuthenticated === false) {
        return `Entrar para adicionar ${productName} à lista de desejos`;
      }

      return isActive
        ? `Remover ${productName} da lista de desejos`
        : `Adicionar ${productName} à lista de desejos`;
    },
    [isActive, isAuthenticated, productName],
  );
  const titleLabel =
    variant === "quick"
      ? isAuthenticated === false
        ? "Entrar para salvar nos desejos"
        : isActive
          ? "Remover dos desejos"
          : "Salvar na lista de desejos"
      : ariaLabel;

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
      title={titleLabel}
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
        "inline-flex items-center justify-center gap-2 rounded-full border text-sm font-black transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816] disabled:cursor-wait disabled:opacity-75",
        variant === "quick"
          ? quickActionButtonBase
          : "h-10 px-3",
        isActive && variant === "quick"
          ? quickActionWishlistActive
          : undefined,
        !isActive && isAuthenticated === false && variant === "quick"
          ? quickActionWishlistAuthHint
          : undefined,
        !isActive && isAuthenticated !== false && variant === "quick"
          ? clsx(quickActionButtonIdle, quickActionWishlistHover)
          : undefined,
        isActive && variant !== "quick"
          ? "border-pink-300/60 bg-pink-500/20 text-pink-100"
          : undefined,
        !isActive && variant !== "quick"
          ? "border-cyan-300/25 bg-slate-950/60 text-slate-200 hover:bg-cyan-400/10"
          : undefined,
        className,
      )}
    >
      {isPending ? (
        <SmartButtonLoading message="Atualizando..." showMessage={showLabel} />
      ) : (
        <>
          <Heart
            size={showLabel ? 16 : 19}
            strokeWidth={showLabel ? 2 : 2.6}
            aria-hidden="true"
            className={clsx(
              "transition-transform duration-200 motion-reduce:transition-none",
              isActive ? "fill-current motion-safe:scale-110" : undefined,
            )}
          />
          {showLabel ? <span>{isActive ? "Favorito" : label}</span> : null}
        </>
      )}
    </button>
  );
}
