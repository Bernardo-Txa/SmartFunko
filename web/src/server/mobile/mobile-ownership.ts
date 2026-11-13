export function findOwnedOrder<T extends { customer_id?: string | null; id: string; order_number: string }>(orders: T[], customerId: string, identifier: string) {
  return orders.find((order) => order.customer_id === customerId && (order.id === identifier || order.order_number === identifier)) ?? null;
}

export function ownsPaymentSession(session: { customer_id?: string | null }, customerId: string) {
  return session.customer_id === customerId;
}
