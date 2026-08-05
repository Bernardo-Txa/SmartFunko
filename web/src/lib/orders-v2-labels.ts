export const v2ApprovalStatusLabels: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovacao",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const v2PaymentStatusLabels: Record<string, string> = {
  cancelado: "Cancelado",
  checkout_gerado: "Checkout gerado",
  nao_pago: "Nao pago",
  pago: "Pago",
  reembolsado: "Reembolsado",
  reembolso_pendente: "Reembolso pendente",
};

export const v2FulfillmentStatusLabels: Record<string, string> = {
  aguardando_fechamento: "Aguardando fechamento",
  cancelado: "Cancelado",
  enviado: "Enviado",
  recebido: "Recebido",
  solicitado: "Solicitado",
};

export const v2SourceLabels: Record<string, string> = {
  admin_manual: "Admin",
  admin_whatsapp: "WhatsApp",
  preorder: "Pre-venda",
  site: "Site",
};

const toneByStatus: Record<string, string> = {
  aguardando_aprovacao: "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
  aguardando_fechamento: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  aprovado: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  cancelado: "border-red-300/40 bg-red-300/10 text-red-100",
  checkout_gerado: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  enviado: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  nao_pago: "border-slate-300/30 bg-slate-300/10 text-slate-100",
  pago: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  recebido: "border-blue-300/40 bg-blue-300/10 text-blue-100",
  recusado: "border-red-300/40 bg-red-300/10 text-red-100",
  reembolsado: "border-zinc-300/40 bg-zinc-300/10 text-zinc-100",
  reembolso_pendente: "border-orange-300/40 bg-orange-300/10 text-orange-100",
  solicitado: "border-indigo-300/40 bg-indigo-300/10 text-indigo-100",
};

export function getV2StatusBadgeClassName(status: string) {
  return [
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
    toneByStatus[status] ?? "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]",
  ].join(" ");
}
