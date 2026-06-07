"use client";

export type WishlistClientItem = {
  id: string;
  product_id: string;
};

let wishlistCache:
  | {
      items: WishlistClientItem[];
      isAuthenticated: boolean;
    }
  | undefined;
let wishlistPromise: Promise<typeof wishlistCache> | undefined;

const wishlistEventName = "smartfunkos:wishlist";

function dispatchWishlistEvent() {
  window.dispatchEvent(new Event(wishlistEventName));
}

export function subscribeWishlist(listener: () => void) {
  window.addEventListener(wishlistEventName, listener);

  return () => window.removeEventListener(wishlistEventName, listener);
}

export function getCachedWishlistItem(productId: string) {
  return wishlistCache?.items.find((item) => item.product_id === productId);
}

export async function loadWishlist() {
  if (wishlistCache) {
    return wishlistCache;
  }

  if (!wishlistPromise) {
    wishlistPromise = fetch("/api/v1/me/wishlist", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          wishlistCache = {
            isAuthenticated: false,
            items: [],
          };
          return wishlistCache;
        }

        if (!response.ok) {
          throw new Error("Falha ao carregar favoritos");
        }

        const payload = (await response.json()) as {
          data?: WishlistClientItem[];
        };

        wishlistCache = {
          isAuthenticated: true,
          items: payload.data ?? [],
        };

        return wishlistCache;
      })
      .catch(() => {
        wishlistCache = {
          isAuthenticated: false,
          items: [],
        };
        return wishlistCache;
      });
  }

  return wishlistPromise;
}

export async function addWishlistProduct(productId: string) {
  const response = await fetch("/api/v1/me/wishlist", {
    body: JSON.stringify({
      priority: "medium",
      productId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401 || response.status === 403) {
    return {
      isAuthenticated: false,
      item: null,
    };
  }

  if (!response.ok) {
    throw new Error("Falha ao salvar favorito");
  }

  const payload = (await response.json()) as {
    data: WishlistClientItem;
  };

  wishlistCache = {
    isAuthenticated: true,
    items: [
      ...(wishlistCache?.items.filter((item) => item.product_id !== productId) ?? []),
      payload.data,
    ],
  };
  dispatchWishlistEvent();

  return {
    isAuthenticated: true,
    item: payload.data,
  };
}

export async function removeWishlistProduct(itemId: string) {
  const response = await fetch(`/api/v1/me/wishlist/${itemId}`, {
    method: "DELETE",
  });

  if (response.status === 401 || response.status === 403) {
    return {
      isAuthenticated: false,
    };
  }

  if (!response.ok) {
    throw new Error("Falha ao remover favorito");
  }

  wishlistCache = {
    isAuthenticated: true,
    items: wishlistCache?.items.filter((item) => item.id !== itemId) ?? [],
  };
  dispatchWishlistEvent();

  return {
    isAuthenticated: true,
  };
}

