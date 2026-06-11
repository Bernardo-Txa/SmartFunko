"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { clsx } from "clsx";
import {
  quickActionButtonBase,
  quickActionButtonIdle,
  quickActionCartAdded,
  quickActionCartHover,
} from "@/components/storefront/quick-action-button-styles";
import {
  addProductToCart,
  type CartProduct,
  readCart,
  readServerCart,
  subscribeCart,
} from "@/lib/client/cart-client";

export function CartButton({
  className,
  label = "Adicionar ao carrinho",
  product,
  showLabel = true,
  variant = "default",
}: {
  className?: string;
  label?: string;
  product: CartProduct;
  showLabel?: boolean;
  variant?: "default" | "quick";
}) {
  const [added, setAdded] = useState<boolean>(false);
  const addedTimeout = useRef<number | null>(null);
  const buttonLabel = added
    ? `${product.name} no carrinho`
    : `Adicionar ${product.name} ao carrinho`;
  const titleLabel =
    variant === "quick"
      ? added
        ? "Adicionado"
        : "Adicionar ao carrinho"
      : buttonLabel;

  useEffect(() => {
    return () => {
      if (addedTimeout.current) {
        window.clearTimeout(addedTimeout.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={buttonLabel}
      title={titleLabel}
      onClick={() => {
        if (addedTimeout.current) {
          window.clearTimeout(addedTimeout.current);
        }

        addProductToCart(product);
        setAdded(true);

        addedTimeout.current = window.setTimeout(() => {
          setAdded(false);
        }, 1800);
      }}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full border text-sm font-black transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816] disabled:cursor-wait disabled:opacity-80",
        variant === "quick"
          ? quickActionButtonBase
          : "h-11 px-4",
        added && variant === "quick"
          ? quickActionCartAdded
          : undefined,
        !added && variant === "quick"
          ? clsx(quickActionButtonIdle, quickActionCartHover)
          : undefined,
        added && variant !== "quick" ? "border-cyan-200/50 bg-cyan-400/20 text-cyan-50" : undefined,
        !added && variant !== "quick"
          ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20"
          : undefined,
        className,
      )}
    >
      {added ? (
        <Check
          size={16}
          strokeWidth={showLabel ? 2 : 2.7}
          aria-hidden="true"
          className="transition-transform duration-200 motion-safe:scale-110 motion-reduce:transition-none"
        />
      ) : (
        <ShoppingCart
          size={16}
          strokeWidth={showLabel ? 2 : 2.5}
          aria-hidden="true"
        />
      )}
      {showLabel ? <span>{added ? "No carrinho" : label}</span> : null}
    </button>
  );
}

export function CartNavButton({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const items = useSyncExternalStore(subscribeCart, readCart, readServerCart);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href="/carrinho"
      prefetch={false}
      className={clsx(
        "relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[#020617]/42 px-3 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15",
        className,
      )}
      aria-label={`Carrinho com ${count} item(ns)`}
      onClick={onClick}
    >
      <ShoppingCart size={16} aria-hidden="true" />
      <span className="hidden sm:inline">Carrinho</span>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--yellow)] px-1 text-[10px] font-black text-[#020617]">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
