"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { clsx } from "clsx";
import type { Product } from "@/types/product";
import {
  addProductToCart,
  readCart,
  subscribeCart,
  type CartItem,
} from "@/lib/client/cart-client";

export function CartButton({
  className,
  label = "Adicionar ao carrinho",
  product,
}: {
  className?: string;
  label?: string;
  product: Product;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
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
      {added ? "No carrinho" : label}
    </button>
  );
}

export function CartNavButton({ className }: { className?: string }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
    return subscribeCart(() => setItems(readCart()));
  }, []);

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

