export type OrderPayableInput = {
  payments?: Array<{
    amount: number | string | null;
    status?: string | null;
  }> | null;
  review_status?: string | null;
  reviewStatus?: string | null;
  status?: string | null;
  total?: number | string | null;
};

const excludedStatuses = new Set(["cancelled", "refunded"]);
const excludedReviewStatuses = new Set(["cancelled", "rejected", "under_review"]);
const payableStatuses = new Set([
  "paid",
  "partially_paid",
  "pending_payment",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
]);
const payableReviewStatuses = new Set(["approved_for_payment", "awaiting_payment", "paid"]);

export function isOrderPayable(order: {
  review_status?: string | null;
  reviewStatus?: string | null;
  status?: string | null;
}) {
  const status = order.status ?? "";
  const reviewStatus = order.review_status ?? order.reviewStatus ?? "";

  if (excludedStatuses.has(status)) {
    return false;
  }

  if (excludedReviewStatuses.has(reviewStatus)) {
    return false;
  }

  return payableStatuses.has(status) || payableReviewStatuses.has(reviewStatus);
}

export function getOrderPaidAmount(order: Pick<OrderPayableInput, "payments">) {
  return (order.payments ?? [])
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export function getOrderPendingAmount(order: OrderPayableInput) {
  if (!isOrderPayable(order)) {
    return 0;
  }

  return Math.max(0, Number(order.total ?? 0) - getOrderPaidAmount(order));
}
