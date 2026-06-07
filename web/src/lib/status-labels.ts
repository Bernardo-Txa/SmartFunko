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
  { label: "Cancelado", value: "cancelled" },
  { label: "Reembolsado", value: "refunded" },
] as const;

export const inventoryStatusOptions = [
  { label: "Disponível", value: "available" },
  { label: "Reservado", value: "reserved" },
  { label: "Vendido", value: "sold" },
  { label: "Em trânsito", value: "in_transit" },
  { label: "Avariado", value: "damaged" },
  { label: "Indisponível", value: "unavailable" },
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
  failed: createMeta("Falhou", "red"),
  paid: createMeta("Pago", "green"),
  pending: createMeta("Pendente", "yellow"),
  refunded: createMeta("Reembolsado", "gray"),
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
  orderStatusMeta,
  orderItemStatusMeta,
  paymentStatusMeta,
  inventoryStatusMeta,
  inventoryMovementTypeMeta,
  productVariantStatusMeta,
  productStatusMeta,
];

export function getOrderStatusMeta(status: string | null | undefined) {
  return getMeta(orderStatusMeta, status);
}

export function getOrderItemStatusMeta(status: string | null | undefined) {
  return getMeta(orderItemStatusMeta, status);
}

export function getPaymentStatusMeta(status: string | null | undefined) {
  return getMeta(paymentStatusMeta, status);
}

export function getInventoryStatusMeta(status: string | null | undefined) {
  return getMeta(inventoryStatusMeta, status);
}

export function getInventoryMovementTypeMeta(type: string | null | undefined) {
  return getMeta(inventoryMovementTypeMeta, type);
}

export function getProductVariantStatusMeta(status: string | null | undefined) {
  return getMeta(productVariantStatusMeta, status);
}

export function getProductStatusMeta(status: string | null | undefined) {
  return getMeta(productStatusMeta, status);
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
