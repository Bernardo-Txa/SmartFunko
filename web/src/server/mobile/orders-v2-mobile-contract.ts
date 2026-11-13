import { z } from "zod";

export const mobileOrderV2IdentifierSchema = z.union([
  z.string().uuid(),
  z.string().trim().regex(/^SFV2-\d{8}-\d{6}-[A-Z0-9]{5}$/),
]);
export const mobilePaymentSessionIdSchema = z.string().uuid();
export const mobileIdempotencyKeySchema = z.string().trim().min(16).max(128);

export const createMobileOrderV2Schema = z.object({
  couponCode: z.string().trim().min(1).max(80).optional().nullable(),
  items: z.array(z.object({
    quantity: z.number().int().positive().max(99),
    variantId: z.string().uuid(),
  })).min(1).max(50),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const createMobilePaymentSessionSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(50),
});

type Relation<T> = T | T[] | null | undefined;

type RawOrder = Record<string, unknown> & {
  approval_status: string;
  competence_id: string;
  created_at: string;
  fulfillment_status: string;
  id: string;
  order_date: string;
  order_number: string;
  payment_status: string;
  total: number | string;
  tracking_code?: string | null;
  tracking_url?: string | null;
  v2_order_competencies?: Relation<Record<string, unknown>>;
  v2_order_items?: Array<Record<string, unknown>>;
  v2_payment_session_orders?: Array<Record<string, unknown>>;
};

function firstRelation<T>(relation: Relation<T>) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function publicPaymentSessionFromLink(link: Record<string, unknown>) {
  const session = firstRelation(link.v2_payment_sessions as Relation<Record<string, unknown>>);
  if (!session) return null;

  return {
    id: String(session.id ?? ""),
    checkoutNumber: String(session.checkout_number ?? ""),
    status: String(session.status ?? ""),
    amount: money(link.amount),
    paymentLinkUrl: typeof session.payment_link_url === "string" ? session.payment_link_url : null,
    paidAt: typeof session.paid_at === "string" ? session.paid_at : null,
    createdAt: typeof session.created_at === "string" ? session.created_at : null,
  };
}

export function toMobileOrderV2Dto(value: unknown) {
  const order = value as RawOrder;
  const competence = firstRelation(order.v2_order_competencies);
  const paymentSessions = (order.v2_payment_session_orders ?? [])
    .map(publicPaymentSessionFromLink)
    .filter((session): session is NonNullable<typeof session> => Boolean(session));

  return {
    id: order.id,
    orderNumber: order.order_number,
    orderDate: order.order_date,
    createdAt: order.created_at,
    approvalStatus: order.approval_status,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    competence: competence ? {
      id: String(competence.id ?? order.competence_id),
      code: String(competence.code ?? ""),
      label: String(competence.label ?? ""),
      startsOn: String(competence.starts_on ?? ""),
      endsOn: String(competence.ends_on ?? ""),
    } : null,
    items: (order.v2_order_items ?? []).map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.product_name ?? "Produto"),
      sku: typeof item.product_sku === "string" ? item.product_sku : null,
      quantity: Number(item.quantity ?? 0),
      unitPrice: money(item.unit_price),
      totalPrice: money(item.total_price),
    })),
    total: money(order.total),
    paymentEligible: order.approval_status === "aprovado"
      && ["nao_pago", "checkout_gerado"].includes(order.payment_status)
      && order.fulfillment_status !== "cancelado"
      && money(order.total) > 0,
    paymentSessions,
    tracking: order.tracking_code || order.tracking_url ? {
      code: order.tracking_code ?? null,
      url: order.tracking_url ?? null,
    } : null,
  };
}

export function toMobilePaymentSessionDto(value: unknown) {
  const session = value as Record<string, unknown>;
  const linkedOrders = Array.isArray(session.v2_payment_session_orders)
    ? session.v2_payment_session_orders as Array<Record<string, unknown>>
    : [];

  return {
    id: String(session.id ?? ""),
    checkoutNumber: String(session.checkout_number ?? ""),
    status: String(session.status ?? ""),
    amount: money(session.amount),
    paymentLinkUrl: typeof session.payment_link_url === "string" ? session.payment_link_url : null,
    paidAt: typeof session.paid_at === "string" ? session.paid_at : null,
    expiresAt: typeof session.expires_at === "string" ? session.expires_at : null,
    orderIds: linkedOrders.flatMap((link) => {
      const order = firstRelation(link.v2_orders as Relation<Record<string, unknown>>);
      return order?.id ? [String(order.id)] : [];
    }),
  };
}
