export type OrderCalculationItem = {
  quantity: number;
  unitPrice: number;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  shippingAmount: number;
  total: number;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateOrderTotals({
  discount = 0,
  items,
  shippingAmount = 0,
}: {
  items: OrderCalculationItem[];
  discount?: number;
  shippingAmount?: number;
}): OrderTotals {
  const subtotal = money(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const total = money(Math.max(0, subtotal - discount + shippingAmount));

  return {
    discount: money(discount),
    shippingAmount: money(shippingAmount),
    subtotal,
    total,
  };
}

export function calculatePaymentStatus(total: number, paidAmount: number) {
  if (paidAmount <= 0) {
    return "pending_payment" as const;
  }

  if (paidAmount + 0.001 >= total) {
    return "paid" as const;
  }

  return "partially_paid" as const;
}
