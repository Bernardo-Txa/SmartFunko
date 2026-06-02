import { clsx } from "clsx";
import type { ProductStatus } from "@/lib/mock-data";

const productStatusLabel: Record<ProductStatus, string> = {
  available: "Disponivel",
  order_only: "Sob encomenda",
  preorder: "Pre-venda",
  sold_out: "Esgotado",
};

const productStatusClass: Record<ProductStatus, string> = {
  available: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  order_only: "bg-sky-50 text-sky-800 ring-sky-200",
  preorder: "bg-amber-50 text-amber-800 ring-amber-200",
  sold_out: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold ring-1",
        productStatusClass[status],
      )}
    >
      {productStatusLabel[status]}
    </span>
  );
}

export function OrderStatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-7 items-center rounded-md bg-[var(--surface-strong)] px-2 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">
      {label}
    </span>
  );
}
