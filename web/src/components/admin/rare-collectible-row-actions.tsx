"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Edit3, Eye, Star, Trash2, Archive } from "lucide-react";
import { useState } from "react";
import type { RareCollectible, RareCollectibleStatus } from "@/server/rare-collectibles/rare-collectible-service";

type Props = {
  item: RareCollectible;
};

const actionButtonClassName =
  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-black text-[var(--foreground)] hover:bg-[var(--surface-strong)] disabled:opacity-60";

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function RareCollectibleRowActions({ item }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const selectedStatus = item.status === "draft" ? "available" : item.status;

  async function runAction(action: () => Promise<Response>, fallbackMessage: string) {
    setError("");
    setIsBusy(true);

    try {
      const response = await action();
      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(body.error?.message ?? fallbackMessage);
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : fallbackMessage);
    } finally {
      setIsBusy(false);
    }
  }

  function updateItem(patch: Record<string, unknown>) {
    return runAction(
      () =>
        fetch(`/api/v1/admin/rare-collectibles/${item.id}`, {
          body: JSON.stringify(patch),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        }),
      "Falha ao atualizar peça",
    );
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Manutenção</p>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/admin/acervo-raro/${item.id}`} className={actionButtonClassName}>
            <Edit3 size={14} aria-hidden="true" />
            Editar
          </Link>
          <Link
            href={`/acervo-raro/${item.slug}`}
            target="_blank"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-amber-200/22 px-3 text-xs font-black text-amber-100 hover:bg-amber-200/8"
          >
            <Eye size={14} aria-hidden="true" />
            Ver
          </Link>
        </div>
      </div>

      <button
        type="button"
        disabled={isBusy}
        onClick={() =>
          updateItem({
            isFeatured: !item.isFeatured,
            status: !item.isFeatured && item.status === "draft" ? "available" : undefined,
          })
        }
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-200/26 bg-amber-200/8 px-3 text-xs font-black text-amber-100 hover:bg-amber-200/14 disabled:opacity-60"
      >
        <Star size={14} aria-hidden="true" />
        {item.isFeatured ? "Remover do slideshow" : "Colocar no slideshow"}
      </button>

      <div>
        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
          Status da peça
        </label>
        <select
          value={selectedStatus}
          disabled={isBusy}
          onChange={(event) => updateItem({ status: event.target.value as RareCollectibleStatus })}
          className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs font-bold text-[var(--foreground)]"
        >
          <option value="available">Disponível</option>
          <option value="reserved">Reservado</option>
          <option value="sold">Vendido</option>
          <option value="archived">Arquivado</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            runAction(
              () => fetch(`/api/v1/admin/rare-collectibles/${item.id}/duplicate`, { method: "POST" }),
              "Falha ao duplicar peça",
            )
          }
          className={actionButtonClassName}
        >
          <Copy size={14} aria-hidden="true" />
          Duplicar
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            runAction(
              () => fetch(`/api/v1/admin/rare-collectibles/${item.id}/archive`, { method: "POST" }),
              "Falha ao arquivar peça",
            )
          }
          className={actionButtonClassName}
        >
          <Archive size={14} aria-hidden="true" />
          Arquivar
        </button>
      </div>

      <div>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            if (!window.confirm(`Excluir "${item.name}" do Acervo Raro?`)) {
              return;
            }

            runAction(
              () => fetch(`/api/v1/admin/rare-collectibles/${item.id}`, { method: "DELETE" }),
              "Falha ao excluir peça",
            );
          }}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-red-300/24 px-3 text-xs font-black text-red-100 hover:bg-red-500/10 disabled:opacity-60"
        >
          <Trash2 size={14} aria-hidden="true" />
          Excluir
        </button>
      </div>
      {error ? <p className="text-xs font-semibold text-red-200">{error}</p> : null}
    </div>
  );
}
