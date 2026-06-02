import { clsx } from "clsx";
import type { ProductStatus } from "@/lib/mock-data";

const productStatusLabel: Record<ProductStatus, string> = {
  available: "Disponivel",
  order_only: "Sob encomenda",
  preorder: "Pre-venda",
  sold_out: "Esgotado",
};

const productStatusClass: Record<ProductStatus, string> = {
  available: "bg-emerald-400/14 text-emerald-200 ring-emerald-300/28",
  order_only: "bg-cyan-400/14 text-cyan-100 ring-cyan-300/28",
  preorder: "bg-yellow-300/14 text-yellow-100 ring-yellow-300/32",
  sold_out: "bg-slate-300/10 text-slate-300 ring-slate-300/20",
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
