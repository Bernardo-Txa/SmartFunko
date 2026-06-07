"use client";

import type { Product } from "@/types/product";

export type CartItem = {
  id: string;
  imageUrl?: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  slug: string;
};

const cartStorageKey = "smartfunkos.cart.v1";
const cartEventName = "smartfunkos:cart";

function dispatchCartEvent() {
  window.dispatchEvent(new Event(cartEventName));
}

function safeParseCart(value: string | null): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id: String(item.id ?? ""),
        imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : undefined,
        name: String(item.name ?? ""),
        price: Number(item.price ?? 0),
        quantity: Math.max(1, Number(item.quantity ?? 1)),
        sku: String(item.sku ?? ""),
        slug: String(item.slug ?? ""),
      }))
      .filter((item) => item.id && item.name && item.slug && item.sku);
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  dispatchCartEvent();
}

export function readCart() {
  if (typeof window === "undefined") {
    return [];
  }

  return safeParseCart(window.localStorage.getItem(cartStorageKey));
}

export function subscribeCart(listener: () => void) {
  window.addEventListener(cartEventName, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(cartEventName, listener);
    window.removeEventListener("storage", listener);
  };
}

export function addProductToCart(product: Product, quantity = 1) {
  const items = readCart();
  const current = items.find((item) => item.id === product.id);
  const nextQuantity = Math.max(1, quantity);

  if (current) {
    current.quantity += nextQuantity;
    writeCart(items);
    return current;
  }

  const item: CartItem = {
    id: product.id,
    imageUrl: product.imageUrl,
    name: product.name,
    price: product.price,
    quantity: nextQuantity,
    sku: product.sku,
    slug: product.slug,
  };

  writeCart([...items, item]);
  return item;
}

export function updateCartItemQuantity(productId: string, quantity: number) {
  const nextQuantity = Math.max(1, quantity);
  writeCart(
    readCart().map((item) =>
      item.id === productId ? { ...item, quantity: nextQuantity } : item,
    ),
  );
}

export function removeCartItem(productId: string) {
  writeCart(readCart().filter((item) => item.id !== productId));
}

export function clearCart() {
  writeCart([]);
}

