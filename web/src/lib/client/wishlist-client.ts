"use client";

export type WishlistClientItem = {
  id: string;
  product_id: string;
};

export type WishlistClientState = {
  errorMessage?: string;
  items: WishlistClientItem[];
  isAuthenticated: boolean;
  isCustomerLinked: boolean;
};

export type WishlistAddResult =
  | {
      errorMessage?: string;
      isAuthenticated: false;
      isCustomerLinked: false;
      item: null;
    }
  | {
      errorMessage?: string;
      isAuthenticated: true;
      isCustomerLinked: false;
      item: null;
    }
  | {
      isAuthenticated: true;
      isCustomerLinked: true;
      item: WishlistClientItem;
    };

export type WishlistRemoveResult =
  | {
      errorMessage?: string;
      isAuthenticated: false;
      isCustomerLinked: false;
    }
  | {
      errorMessage?: string;
      isAuthenticated: true;
      isCustomerLinked: false;
    }
  | {
      isAuthenticated: true;
      isCustomerLinked: true;
    };

let wishlistCache: WishlistClientState | undefined;
let wishlistPromise: Promise<WishlistClientState> | undefined;

const wishlistEventName = "smartfunkos:wishlist";

function dispatchWishlistEvent(): void {
  window.dispatchEvent(new Event(wishlistEventName));
}

export function subscribeWishlist(listener: () => void): () => void {
  window.addEventListener(wishlistEventName, listener);

  return () => window.removeEventListener(wishlistEventName, listener);
}

export function getCachedWishlistItem(productId: string): WishlistClientItem | undefined {
  return wishlistCache?.items.find((item) => item.product_id === productId);
}

export async function loadWishlist(): Promise<WishlistClientState> {
  if (wishlistCache) {
    return wishlistCache;
  }

  if (!wishlistPromise) {
    wishlistPromise = fetch("/api/v1/me/wishlist", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          wishlistCache = {
            isAuthenticated: false,
            isCustomerLinked: false,
            items: [],
          };
          return wishlistCache;
        }

        if (response.status === 403) {
          const payload = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;

          wishlistCache = {
            errorMessage:
              payload?.error?.message ??
              "Seu login ainda não tem um cadastro de cliente vinculado.",
            isAuthenticated: true,
            isCustomerLinked: false,
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
          isCustomerLinked: true,
          items: payload.data ?? [],
        };

        return wishlistCache;
      })
      .catch(() => {
        wishlistCache = {
          isAuthenticated: false,
          isCustomerLinked: false,
          items: [],
        };
        return wishlistCache;
      });
  }

  return wishlistPromise;
}

export async function addWishlistProduct(productId: string): Promise<WishlistAddResult> {
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

  if (response.status === 401) {
    return {
      isAuthenticated: false,
      isCustomerLinked: false,
      item: null,
    };
  }

  if (response.status === 403) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    return {
      errorMessage:
        payload?.error?.message ??
        "Seu login ainda não tem um cadastro de cliente vinculado.",
      isAuthenticated: true,
      isCustomerLinked: false,
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
    isCustomerLinked: true,
    items: [
      ...(wishlistCache?.items.filter((item) => item.product_id !== productId) ?? []),
      payload.data,
    ],
  };
  dispatchWishlistEvent();

  return {
    isAuthenticated: true,
    isCustomerLinked: true,
    item: payload.data,
  };
}

export async function removeWishlistProduct(itemId: string): Promise<WishlistRemoveResult> {
  const response = await fetch(`/api/v1/me/wishlist/${itemId}`, {
    method: "DELETE",
  });

  if (response.status === 401) {
    return {
      isAuthenticated: false,
      isCustomerLinked: false,
    };
  }

  if (response.status === 403) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    return {
      errorMessage:
        payload?.error?.message ??
        "Seu login ainda não tem um cadastro de cliente vinculado.",
      isAuthenticated: true,
      isCustomerLinked: false,
    };
  }

  if (!response.ok) {
    throw new Error("Falha ao remover favorito");
  }

  wishlistCache = {
    isAuthenticated: true,
    isCustomerLinked: true,
    items: wishlistCache?.items.filter((item) => item.id !== itemId) ?? [],
  };
  dispatchWishlistEvent();

  return {
    isAuthenticated: true,
    isCustomerLinked: true,
  };
}
