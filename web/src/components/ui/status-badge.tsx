import { clsx } from "clsx";
import type { ProductStatus } from "@/types/product";
import {
  getInventoryStatusMeta,
  getOrderItemStatusMeta,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  getProductStatusMeta,
  getProductVariantStatusMeta,
  getStatusBadgeClassName,
  type StatusMeta,
} from "@/lib/status-labels";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = getProductVariantStatusMeta(status);

  return (
    <span
      className={clsx(
        getStatusBadgeClassName(meta),
        "rounded-full px-3 text-[11px] font-black uppercase",
      )}
    >
      {meta.label}
    </span>
  );
}

function StatusBadge({
  className,
  meta,
}: {
  className?: string;
  meta: StatusMeta;
}) {
  return (
    <span className={getStatusBadgeClassName(meta, className)}>
      {meta.label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge meta={getOrderStatusMeta(status)} />;
}

export function OrderItemStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge meta={getOrderItemStatusMeta(status)} />;
}

export function PaymentStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge meta={getPaymentStatusMeta(status)} />;
}

export function InventoryStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge meta={getInventoryStatusMeta(status)} />;
}

export function ProductVariantStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge meta={getProductVariantStatusMeta(status)} />;
}

export function ProductPublishStatusBadge({ status }: { status: string | null | undefined }) {
  return <StatusBadge meta={getProductStatusMeta(status)} />;
}
