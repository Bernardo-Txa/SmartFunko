import { clsx } from "clsx";

export type StatusTone = "blue" | "cyan" | "gray" | "green" | "red" | "violet" | "yellow";

export type StatusMeta = {
  className: string;
  label: string;
  tone: StatusTone;
};

const toneClass: Record<StatusTone, string> = {
  blue: "bg-blue-500/15 text-blue-100 ring-blue-400/40",
  cyan: "bg-cyan-500/15 text-cyan-100 ring-cyan-400/40",
  gray: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  green: "bg-emerald-500/15 text-emerald-100 ring-emerald-400/40",
  red: "bg-red-500/15 text-red-100 ring-red-400/40",
  violet: "bg-violet-500/15 text-violet-100 ring-violet-400/40",
  yellow: "bg-yellow-300/18 text-yellow-100 ring-yellow-300/45",
};

export const orderStatusOptions = [
  { label: "Rascunho", value: "draft" },
  { label: "Aguardando pagamento", value: "pending_payment" },
  { label: "Parcialmente pago", value: "partially_paid" },
  { label: "Pago", value: "paid" },
  { label: "Em processamento", value: "processing" },
  { label: "Pronto para envio", value: "ready_to_ship" },
  { label: "Enviado", value: "shipped" },
  { label: "Entregue", value: "delivered" },
  { label: "Cancelado", value: "cancelled" },
  { label: "Reembolsado", value: "refunded" },
] as const;

export const orderItemStatusOptions = [
  { label: "Solicitado", value: "requested" },
  { label: "Reservado", value: "reserved" },
  { label: "Aguardando pagamento", value: "waiting_payment" },
  { label: "Pago", value: "paid" },
  { label: "Aguardando compra", value: "waiting_purchase" },
  { label: "Comprado", value: "purchased" },
  { label: "Em trânsito", value: "in_transit" },
  { label: "Recebido", value: "received" },
  { label: "Pronto para envio", value: "ready_to_ship" },
  { label: "Enviado", value: "shipped" },
  { label: "Entregue", value: "delivered" },
  { label: "Cancelado", value: "cancelled" },
] as const;

export const paymentStatusOptions = [
  { label: "Pendente", value: "pending" },
  { label: "Pago", value: "paid" },
  { label: "Falhou", value: "failed" },
  { label: "Expirado", value: "expired" },
  { label: "Cancelado", value: "cancelled" },
  { label: "Reembolsado", value: "refunded" },
] as const;

export const orderReviewStatusOptions = [
  { label: "Em análise", value: "under_review" },
  { label: "Aprovado", value: "approved_for_payment" },
  { label: "Aguardando pagamento", value: "awaiting_payment" },
  { label: "Recusado", value: "rejected" },
  { label: "Pago", value: "paid" },
  { label: "Cancelado", value: "cancelled" },
] as const;

export const cashEntryTypeOptions = [
  { label: "Entrada", value: "income" },
  { label: "Saída", value: "expense" },
  { label: "Ajuste", value: "adjustment" },
] as const;

export const cashEntryCategoryOptions = [
  { label: "Venda", value: "sale" },
  { label: "Rifa", value: "raffle" },
  { label: "Compra de fornecedor", value: "supplier_purchase" },
  { label: "Frete", value: "shipping" },
  { label: "Taxa de pagamento", value: "payment_fee" },
  { label: "Reembolso", value: "refund" },
  { label: "Ajuste manual", value: "manual_adjustment" },
] as const;

export const inventoryStatusOptions = [
  { label: "Disponível", value: "available" },
  { label: "Reservado", value: "reserved" },
  { label: "Vendido", value: "sold" },
  { label: "Em trânsito", value: "in_transit" },
  { label: "Avariado", value: "damaged" },
  { label: "Indisponível", value: "unavailable" },
] as const;

export const purchaseBatchStatusOptions = [
  { label: "Rascunho", value: "draft" },
  { label: "Aberto", value: "open" },
  { label: "Fechado", value: "closed" },
  { label: "Comprado", value: "purchased" },
  { label: "Em trânsito", value: "in_transit" },
  { label: "Recebido", value: "received" },
  { label: "Cancelado", value: "cancelled" },
] as const;

export const purchaseBatchTypeOptions = [
  { label: "Nacional", value: "national" },
  { label: "Internacional", value: "international" },
  { label: "Collab", value: "collab" },
  { label: "Outro", value: "other" },
] as const;

export const purchaseBatchItemStatusOptions = [
  { label: "Planejado", value: "planned" },
  { label: "Aprovado", value: "approved" },
  { label: "Comprado", value: "purchased" },
  { label: "Em trânsito", value: "in_transit" },
  { label: "Recebido", value: "received" },
  { label: "Cancelado", value: "cancelled" },
] as const;

export const productVariantStatusOptions = [
  { label: "Disponível", value: "available" },
  { label: "Sob encomenda", value: "order_only" },
  { label: "Pré-venda", value: "preorder" },
  { label: "Esgotado", value: "sold_out" },
  { label: "Oculto", value: "hidden" },
] as const;

export const productStatusOptions = [
  { label: "Ativo", value: "active" },
  { label: "Inativo", value: "inactive" },
  { label: "Arquivado", value: "archived" },
] as const;

export const raffleCampaignStatusOptions = [
  { label: "Rascunho", value: "draft" },
  { label: "Aberta", value: "open" },
  { label: "Pausada", value: "paused" },
  { label: "Esgotada", value: "sold_out" },
  { label: "Encerrada", value: "closed" },
  { label: "Sorteada", value: "drawn" },
  { label: "Cancelada", value: "cancelled" },
] as const;

export const raffleNumberStatusOptions = [
  { label: "Disponível", value: "available" },
  { label: "Aguardando pagamento", value: "pending_payment" },
  { label: "Comprado", value: "sold" },
  { label: "Cancelado", value: "cancelled" },
  { label: "Premiado", value: "winner" },
] as const;

export const raffleOrderStatusOptions = [
  { label: "Aguardando pagamento", value: "pending_payment" },
  { label: "Pago", value: "paid" },
  { label: "Expirado", value: "expired" },
  { label: "Cancelado", value: "cancelled" },
  { label: "Reembolsado", value: "refunded" },
] as const;

export const raffleDrawMethodOptions = [
  { label: "Resultado externo/manual", value: "manual_external" },
  { label: "Sorteio interno auditável", value: "internal_random" },
] as const;

const orderStatusMeta = {
  cancelled: createMeta("Cancelado", "red"),
  delivered: createMeta("Entregue", "green"),
  draft: createMeta("Rascunho", "gray"),
  paid: createMeta("Pago", "green"),
  partially_paid: createMeta("Parcialmente pago", "blue"),
  pending_payment: createMeta("Aguardando pagamento", "yellow"),
  processing: createMeta("Em processamento", "violet"),
  ready_to_ship: createMeta("Pronto para envio", "cyan"),
  refunded: createMeta("Reembolsado", "gray"),
  shipped: createMeta("Enviado", "cyan"),
} satisfies Record<string, StatusMeta>;

const orderItemStatusMeta = {
  cancelled: createMeta("Cancelado", "red"),
  delivered: createMeta("Entregue", "green"),
  in_transit: createMeta("Em trânsito", "cyan"),
  paid: createMeta("Pago", "green"),
  purchased: createMeta("Comprado", "blue"),
  ready_to_ship: createMeta("Pronto para envio", "cyan"),
  received: createMeta("Recebido", "green"),
  requested: createMeta("Solicitado", "yellow"),
  reserved: createMeta("Reservado", "blue"),
  shipped: createMeta("Enviado", "cyan"),
  waiting_payment: createMeta("Aguardando pagamento", "yellow"),
  waiting_purchase: createMeta("Aguardando compra", "yellow"),
} satisfies Record<string, StatusMeta>;

const paymentStatusMeta = {
  cancelled: createMeta("Cancelado", "red"),
  expired: createMeta("Expirado", "red"),
  failed: createMeta("Falhou", "red"),
  paid: createMeta("Pago", "green"),
  pending: createMeta("Pendente", "yellow"),
  refunded: createMeta("Reembolsado", "gray"),
} satisfies Record<string, StatusMeta>;

const orderReviewStatusMeta = {
  approved_for_payment: createMeta("Aprovado", "blue"),
  awaiting_payment: createMeta("Aguardando pagamento", "yellow"),
  cancelled: createMeta("Cancelado", "red"),
  paid: createMeta("Pago", "green"),
  rejected: createMeta("Recusado", "red"),
  under_review: createMeta("Em análise", "violet"),
} satisfies Record<string, StatusMeta>;

const cashEntryTypeMeta = {
  adjustment: createMeta("Ajuste", "yellow"),
  expense: createMeta("Saída", "red"),
  income: createMeta("Entrada", "green"),
} satisfies Record<string, StatusMeta>;

const cashEntryCategoryMeta = {
  manual_adjustment: createMeta("Ajuste manual", "yellow"),
  payment_fee: createMeta("Taxa de pagamento", "yellow"),
  raffle: createMeta("Rifa", "cyan"),
  refund: createMeta("Reembolso", "red"),
  sale: createMeta("Venda", "green"),
  shipping: createMeta("Frete", "cyan"),
  supplier_purchase: createMeta("Compra de fornecedor", "violet"),
} satisfies Record<string, StatusMeta>;

const inventoryStatusMeta = {
  available: createMeta("Disponível", "green"),
  damaged: createMeta("Avariado", "red"),
  in_transit: createMeta("Em trânsito", "cyan"),
  reserved: createMeta("Reservado", "blue"),
  sold: createMeta("Vendido", "gray"),
  unavailable: createMeta("Indisponível", "gray"),
} satisfies Record<string, StatusMeta>;

const inventoryMovementTypeMeta = {
  cancelled: createMeta("Cancelado", "red"),
  cost_adjustment: createMeta("Ajuste de custo", "yellow"),
  created: createMeta("Criado", "green"),
  damaged: createMeta("Avariado", "red"),
  location_change: createMeta("Mudança de localização", "cyan"),
  manual_adjustment: createMeta("Ajuste manual", "yellow"),
  received: createMeta("Recebido", "green"),
  released: createMeta("Reserva liberada", "cyan"),
  reserved: createMeta("Reservado", "blue"),
  sold: createMeta("Vendido", "gray"),
  status_change: createMeta("Alteração de status", "violet"),
  unavailable: createMeta("Indisponível", "gray"),
} satisfies Record<string, StatusMeta>;

const purchaseBatchStatusMeta = {
  cancelled: createMeta("Cancelado", "red"),
  closed: createMeta("Fechado", "yellow"),
  draft: createMeta("Rascunho", "gray"),
  in_transit: createMeta("Em trânsito", "cyan"),
  open: createMeta("Aberto", "blue"),
  purchased: createMeta("Comprado", "violet"),
  received: createMeta("Recebido", "green"),
} satisfies Record<string, StatusMeta>;

const purchaseBatchTypeMeta = {
  collab: createMeta("Collab", "violet"),
  international: createMeta("Internacional", "cyan"),
  national: createMeta("Nacional", "blue"),
  other: createMeta("Outro", "gray"),
} satisfies Record<string, StatusMeta>;

const purchaseBatchItemStatusMeta = {
  approved: createMeta("Aprovado", "blue"),
  cancelled: createMeta("Cancelado", "red"),
  in_transit: createMeta("Em trânsito", "cyan"),
  planned: createMeta("Planejado", "gray"),
  purchased: createMeta("Comprado", "violet"),
  received: createMeta("Recebido", "green"),
} satisfies Record<string, StatusMeta>;

const productVariantStatusMeta = {
  available: createMeta("Disponível", "green"),
  hidden: createMeta("Oculto", "gray"),
  order_only: createMeta("Sob encomenda", "yellow"),
  preorder: createMeta("Pré-venda", "cyan"),
  sold_out: createMeta("Esgotado", "red"),
} satisfies Record<string, StatusMeta>;

const productStatusMeta = {
  active: createMeta("Ativo", "green"),
  archived: createMeta("Arquivado", "gray"),
  inactive: createMeta("Inativo", "gray"),
} satisfies Record<string, StatusMeta>;

const raffleCampaignStatusMeta = {
  cancelled: createMeta("Cancelada", "red"),
  closed: createMeta("Encerrada", "yellow"),
  draft: createMeta("Rascunho", "gray"),
  drawn: createMeta("Sorteada", "green"),
  open: createMeta("Aberta", "green"),
  paused: createMeta("Pausada", "yellow"),
  sold_out: createMeta("Esgotada", "violet"),
} satisfies Record<string, StatusMeta>;

const raffleNumberStatusMeta = {
  available: createMeta("Disponível", "green"),
  cancelled: createMeta("Cancelado", "red"),
  pending_payment: createMeta("Aguardando pagamento", "yellow"),
  sold: createMeta("Comprado", "gray"),
  winner: createMeta("Premiado", "green"),
} satisfies Record<string, StatusMeta>;

const raffleOrderStatusMeta = {
  cancelled: createMeta("Cancelado", "red"),
  expired: createMeta("Expirado", "gray"),
  paid: createMeta("Pago", "green"),
  pending_payment: createMeta("Aguardando pagamento", "yellow"),
  refunded: createMeta("Reembolsado", "gray"),
} satisfies Record<string, StatusMeta>;

const raffleDrawMethodMeta = {
  internal_random: createMeta("Sorteio interno auditável", "violet"),
  manual_external: createMeta("Resultado externo/manual", "blue"),
} satisfies Record<string, StatusMeta>;

function createMeta(label: string, tone: StatusTone): StatusMeta {
  return {
    className: toneClass[tone],
    label,
    tone,
  };
}

function fallbackStatusMeta(status: string | null | undefined): StatusMeta {
  const label = (status || "indefinido")
    .split("_")
    .filter(Boolean)
    .join(" ")
    .replace(/^./, (letter) => letter.toUpperCase());

  return createMeta(label, "gray");
}

function getMeta(map: Readonly<Record<string, StatusMeta>>, status: string | null | undefined) {
  return status ? map[status] ?? fallbackStatusMeta(status) : fallbackStatusMeta(status);
}

const operationalStatusMaps: ReadonlyArray<Readonly<Record<string, StatusMeta>>> = [
  orderReviewStatusMeta,
  orderStatusMeta,
  orderItemStatusMeta,
  paymentStatusMeta,
  cashEntryTypeMeta,
  cashEntryCategoryMeta,
  inventoryStatusMeta,
  inventoryMovementTypeMeta,
  purchaseBatchStatusMeta,
  purchaseBatchTypeMeta,
  purchaseBatchItemStatusMeta,
  productVariantStatusMeta,
  productStatusMeta,
  raffleCampaignStatusMeta,
  raffleNumberStatusMeta,
  raffleOrderStatusMeta,
  raffleDrawMethodMeta,
];

export function getOrderStatusMeta(status: string | null | undefined) {
  return getMeta(orderStatusMeta, status);
}

export function getOrderReviewStatusMeta(status: string | null | undefined) {
  return getMeta(orderReviewStatusMeta, status);
}

export function getOrderItemStatusMeta(status: string | null | undefined) {
  return getMeta(orderItemStatusMeta, status);
}

export function getPaymentStatusMeta(status: string | null | undefined) {
  return getMeta(paymentStatusMeta, status);
}

export function getCashEntryTypeMeta(type: string | null | undefined) {
  return getMeta(cashEntryTypeMeta, type);
}

export function getCashEntryCategoryMeta(category: string | null | undefined) {
  return getMeta(cashEntryCategoryMeta, category);
}

export function getInventoryStatusMeta(status: string | null | undefined) {
  return getMeta(inventoryStatusMeta, status);
}

export function getInventoryMovementTypeMeta(type: string | null | undefined) {
  return getMeta(inventoryMovementTypeMeta, type);
}

export function getPurchaseBatchStatusMeta(status: string | null | undefined) {
  return getMeta(purchaseBatchStatusMeta, status);
}

export function getPurchaseBatchTypeMeta(type: string | null | undefined) {
  return getMeta(purchaseBatchTypeMeta, type);
}

export function getPurchaseBatchItemStatusMeta(status: string | null | undefined) {
  return getMeta(purchaseBatchItemStatusMeta, status);
}

export function getProductVariantStatusMeta(status: string | null | undefined) {
  return getMeta(productVariantStatusMeta, status);
}

export function getProductStatusMeta(status: string | null | undefined) {
  return getMeta(productStatusMeta, status);
}

export function getRaffleCampaignStatusMeta(status: string | null | undefined) {
  return getMeta(raffleCampaignStatusMeta, status);
}

export function getRaffleNumberStatusMeta(status: string | null | undefined) {
  return getMeta(raffleNumberStatusMeta, status);
}

export function getRaffleOrderStatusMeta(status: string | null | undefined) {
  return getMeta(raffleOrderStatusMeta, status);
}

export function getRaffleDrawMethodMeta(method: string | null | undefined) {
  return getMeta(raffleDrawMethodMeta, method);
}

export function getOperationalStatusMeta(status: string | null | undefined) {
  if (!status) {
    return fallbackStatusMeta(status);
  }

  for (const map of operationalStatusMaps) {
    const meta = map[status];

    if (meta) {
      return meta;
    }
  }

  return fallbackStatusMeta(status);
}

export function getStatusBadgeClassName(meta: StatusMeta, className?: string) {
  return clsx(
    "inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold ring-1",
    meta.className,
    className,
  );
}
