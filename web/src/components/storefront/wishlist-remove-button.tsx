"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";

export function WishlistRemoveButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={async () => {
          if (!window.confirm("Remover este produto da sua lista?")) {
            return;
          }

          setError("");
          setIsPending(true);

          try {
            const response = await fetch(`/api/v1/me/wishlist/${itemId}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              const payload = response.status === 204 ? null : await response.json().catch(() => null);

              throw new Error(payload?.error?.message ?? "Não foi possível remover este desejo agora.");
            }

            router.refresh();
          } catch (requestError) {
            setError(
              requestError instanceof Error
                ? requestError.message
                : "Não foi possível remover este desejo agora.",
            );
          } finally {
            setIsPending(false);
          }
        }}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-600/80 px-4 text-sm font-black text-slate-200 hover:border-red-300/35 hover:bg-red-500/10 hover:text-red-100 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? (
          <SmartButtonLoading message="Removendo..." />
        ) : (
          <>
            <Trash2 size={16} aria-hidden="true" />
            Remover
          </>
        )}
      </button>
      {error ? <p className="max-w-56 text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}
