"use client";

import type { Product } from "@/types/product";

export type CartProduct = Pick<
  Product,
  "id" | "imageUrl" | "name" | "price" | "sku" | "slug" | "variantId"
>;

export type CartItem = {
  id: string;
  imageUrl?: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  slug: string;
  variantId?: string;
};

const cartStorageKey = "smartfunkos.cart.v1";
const cartEventName = "smartfunkos:cart";
const emptyCart: CartItem[] = [];
let lastCartSerialized: string | null | undefined;
let cartSnapshot: CartItem[] | undefined;

function dispatchCartEvent(): void {
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
        variantId: typeof item.variantId === "string" ? item.variantId : undefined,
      }))
      .filter((item) => item.id && item.name && item.slug && item.sku);
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  const serialized = JSON.stringify(items);

  cartSnapshot = items;
  lastCartSerialized = serialized;
  window.localStorage.setItem(cartStorageKey, serialized);
  dispatchCartEvent();
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") {
    return emptyCart;
  }

  const serialized = window.localStorage.getItem(cartStorageKey);

  if (cartSnapshot && serialized === lastCartSerialized) {
    return cartSnapshot;
  }

  lastCartSerialized = serialized;
  cartSnapshot = safeParseCart(serialized);
  return cartSnapshot;
}

export function readServerCart(): CartItem[] {
  return emptyCart;
}

export function subscribeCart(listener: () => void): () => void {
  window.addEventListener(cartEventName, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(cartEventName, listener);
    window.removeEventListener("storage", listener);
  };
}

export function addProductToCart(product: CartProduct, quantity = 1): CartItem {
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
    variantId: product.variantId,
  };

  writeCart([...items, item]);
  return item;
}

export function updateCartItemQuantity(productId: string, quantity: number): void {
  const nextQuantity = Math.max(1, quantity);
  writeCart(
    readCart().map((item) =>
      item.id === productId ? { ...item, quantity: nextQuantity } : item,
    ),
  );
}

export function removeCartItem(productId: string): void {
  writeCart(readCart().filter((item) => item.id !== productId));
}

export function clearCart(): void {
  writeCart([]);
}
