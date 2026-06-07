"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { clsx } from "clsx";
import type { Product } from "@/types/product";
import {
  addProductToCart,
  readCart,
  readServerCart,
  subscribeCart,
} from "@/lib/client/cart-client";

export function CartButton({
  className,
  label = "Adicionar ao carrinho",
  product,
  showLabel = true,
}: {
  className?: string;
  label?: string;
  product: Product;
  showLabel?: boolean;
}) {
  const [added, setAdded] = useState<boolean>(false);

  return (
    <button
      type="button"
      aria-label={added ? `${product.name} no carrinho` : `Adicionar ${product.name} ao carrinho`}
      onClick={() => {
        addProductToCart(product);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 text-sm font-black text-cyan-50 hover:bg-cyan-400/18",
        className,
      )}
    >
      {added ? <Check size={16} aria-hidden="true" /> : <ShoppingCart size={16} aria-hidden="true" />}
      {showLabel ? <span>{added ? "No carrinho" : label}</span> : null}
    </button>
  );
}

export function CartNavButton({ className }: { className?: string }) {
  const items = useSyncExternalStore(subscribeCart, readCart, readServerCart);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href="/carrinho"
      prefetch={false}
      className={clsx(
        "relative inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[#020617]/42 px-3 text-sm font-bold text-[var(--foreground)] hover:bg-cyan-400/15",
        className,
      )}
      aria-label={`Carrinho com ${count} item(ns)`}
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
