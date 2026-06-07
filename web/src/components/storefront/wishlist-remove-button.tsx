"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function WishlistRemoveButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);

        try {
          const response = await fetch(`/api/v1/me/wishlist/${itemId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            router.refresh();
          }
        } finally {
          setIsPending(false);
        }
      }}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-red-300/30 px-3 text-sm font-bold text-red-100 hover:bg-red-500/12 disabled:cursor-wait disabled:opacity-70"
    >
      <Trash2 size={16} aria-hidden="true" />
      Remover
    </button>
  );
}

