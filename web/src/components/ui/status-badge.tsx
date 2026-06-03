import { clsx } from "clsx";
import type { ProductStatus } from "@/types/product";

const productStatusLabel: Record<ProductStatus, string> = {
  available: "DISPONIVEL",
  order_only: "SOB ENCOMENDA",
  preorder: "PRE-VENDA",
  sold_out: "ESGOTADO",
};

const productStatusClass: Record<ProductStatus, string> = {
  available: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
  order_only: "bg-cyan-500/20 text-cyan-100 ring-cyan-400/40",
  preorder: "bg-yellow-300 text-slate-950 ring-yellow-200/50",
  sold_out: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-black ring-1",
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
