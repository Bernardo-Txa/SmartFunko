#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const requireFromWeb = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const BATCH_SIZE = 400;
const LEGACY_PREFIX = "Migracao V1 -> V2";
const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function parseArgs(argv) {
  const args = {
    cleanV2: true,
    dryRun: true,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--execute") {
      args.dryRun = false;
    } else if (arg === "--limit") {
      args.limit = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--keep-v2") {
      args.cleanV2 = false;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit <= 0)) {
    throw new Error("--limit deve ser um inteiro positivo");
  }

  return args;
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rawValue] = trimmed.split("=");

    if (!process.env[key]) {
      process.env[key] = rawValue.join("=").replace(/^['"]|['"]$/g, "");
    }
  }
}

function chunks(values, size = BATCH_SIZE) {
  const result = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}

async function fetchAll(supabase, table, select, { limit, order } = {}) {
  const rows = [];
  let from = 0;

  while (limit === null || rows.length < limit) {
    const remaining = limit === null ? BATCH_SIZE : Math.min(BATCH_SIZE, limit - rows.length);
    let query = supabase.from(table).select(select).range(from, from + remaining - 1);

    if (order) {
      query = query.order(order.column, { ascending: order.ascending });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < remaining) {
      break;
    }

    from += remaining;
  }

  return rows;
}

async function insertChunked(supabase, table, rows, select) {
  const returned = [];

  for (const chunk of chunks(rows)) {
    const query = supabase.from(table).insert(chunk);
    const { data, error } = select ? await query.select(select) : await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    if (data) {
      returned.push(...data);
    }
  }

  return returned;
}

async function upsertChunked(supabase, table, rows, options, select) {
  const returned = [];

  for (const chunk of chunks(rows)) {
    const query = supabase.from(table).upsert(chunk, options);
    const { data, error } = select ? await query.select(select) : await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    if (data) {
      returned.push(...data);
    }
  }

  return returned;
}

async function deleteAll(supabase, table) {
  const { error } = await supabase.from(table).delete().not("id", "is", null);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

function firstRelation(relation) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function toDateString(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(value).toISOString().slice(0, 10);
}

function monthEnd(year, month) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function calendarCompetenceForDate(date) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));

  return {
    code: `${date.slice(0, 7)}-legacy`,
    ends_on: monthEnd(year, month),
    label: `${MONTH_LABELS[month - 1]}/${year} legado`,
    notes: "Competencia criada automaticamente para migracao de pedidos V1.",
    starts_on: `${date.slice(0, 7)}-01`,
    status: "open",
  };
}

function findCompetenceForDate(date, competencies) {
  return competencies.find((competence) => competence.starts_on <= date && competence.ends_on >= date) ?? null;
}

function sourceFromChannel(channel) {
  if (channel === "website") {
    return "site";
  }

  if (channel === "whatsapp") {
    return "admin_whatsapp";
  }

  return "admin_manual";
}

function activeItems(items) {
  return items.filter((item) => item.status !== "cancelled");
}

function paidPayments(payments) {
  return payments.filter((payment) => payment.status === "paid");
}

function refundedPayments(payments) {
  return payments.filter((payment) => payment.status === "refunded");
}

function sumPayments(payments) {
  return roundMoney(payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0));
}

function approvalStatusFor(order) {
  if (order.review_status === "under_review") {
    return "aguardando_aprovacao";
  }

  if (order.review_status === "rejected") {
    return "recusado";
  }

  return "aprovado";
}

function paymentStatusFor(order, payments, targetTotal) {
  const paidAmount = sumPayments(paidPayments(payments));
  const refundedAmount = sumPayments(refundedPayments(payments));
  const cancelled = order.status === "cancelled" || order.review_status === "cancelled";
  const rejected = order.review_status === "rejected";
  const effectivelyPaid = paidAmount + 0.01 >= Number(order.total ?? 0) || targetTotal <= 0;

  if (order.status === "refunded" || (refundedAmount > 0 && refundedAmount + 0.01 >= paidAmount)) {
    return "reembolsado";
  }

  if (cancelled || rejected) {
    return paidAmount > 0 ? "reembolso_pendente" : "cancelado";
  }

  if (effectivelyPaid || ["paid", "processing", "ready_to_ship", "shipped", "delivered"].includes(order.status)) {
    return "pago";
  }

  return "nao_pago";
}

function fulfillmentStatusFor(order, items, paymentStatus) {
  if (["cancelado", "reembolsado", "reembolso_pendente"].includes(paymentStatus)) {
    return "cancelado";
  }

  if (paymentStatus !== "pago") {
    return "aguardando_fechamento";
  }

  if (["shipped", "delivered"].includes(order.status)) {
    return "enviado";
  }

  if (order.status === "ready_to_ship") {
    return "recebido";
  }

  const statuses = activeItems(items).map((item) => item.status);

  if (statuses.some((status) => ["shipped", "delivered"].includes(status))) {
    return "enviado";
  }

  if (statuses.some((status) => ["received", "ready_to_ship"].includes(status))) {
    return "recebido";
  }

  if (statuses.some((status) => ["purchased", "in_transit"].includes(status))) {
    return "solicitado";
  }

  return "aguardando_fechamento";
}

function getProductInfo(item) {
  const variant = firstRelation(item.product_variants);
  const product = firstRelation(variant?.products);

  return {
    name: product?.name || variant?.sku || `Produto legado ${item.id}`,
    sku: variant?.sku ?? null,
  };
}

function buildV2Items(order, items, targetTotal) {
  const rows = activeItems(items).map((item) => {
    const product = getProductInfo(item);

    return {
      legacyOrderItemId: item.id,
      productName: product.name,
      productSku: product.sku,
      productVariantId: item.product_variant_id ?? null,
      quantity: Number(item.quantity ?? 1),
      unitPrice: roundMoney(item.unit_price ?? 0),
    };
  });

  if (Number(order.shipping_amount ?? 0) > 0) {
    rows.push({
      legacyOrderItemId: null,
      productName: `Frete legado do pedido ${order.order_number}`,
      productSku: "FRETE-LEGADO",
      productVariantId: null,
      quantity: 1,
      unitPrice: roundMoney(order.shipping_amount),
    });
  }

  if (rows.length === 0) {
    rows.push({
      legacyOrderItemId: null,
      productName: `Pedido legado ${order.order_number}`,
      productSku: "PEDIDO-LEGADO",
      productVariantId: null,
      quantity: 1,
      unitPrice: roundMoney(targetTotal),
    });
  }

  let subtotal = roundMoney(rows.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));

  if (targetTotal > subtotal + 0.01) {
    rows.push({
      legacyOrderItemId: null,
      productName: `Ajuste legado do pedido ${order.order_number}`,
      productSku: "AJUSTE-LEGADO",
      productVariantId: null,
      quantity: 1,
      unitPrice: roundMoney(targetTotal - subtotal),
    });
    subtotal = roundMoney(rows.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  }

  return {
    discount: roundMoney(Math.max(0, subtotal - targetTotal)),
    rows,
    subtotal,
  };
}

function buildMigrationNotes(order, paidAmount, targetTotal) {
  const notes = [
    `${LEGACY_PREFIX}: pedido original ${order.order_number}.`,
    `Status V1: ${order.status}; revisao V1: ${order.review_status}.`,
  ];

  if (Number(order.shipping_amount ?? 0) > 0) {
    notes.push(`Frete V1 migrado como item legado: ${roundMoney(order.shipping_amount).toFixed(2)}.`);
  }

  if (paidAmount > 0 && paidAmount + 0.01 < Number(order.total ?? 0)) {
    notes.push(`Pagamento parcial V1 considerado no saldo: pago ${paidAmount.toFixed(2)}, saldo V2 ${targetTotal.toFixed(2)}.`);
  }

  if (order.rejected_reason) {
    notes.push(`Recusa V1: ${order.rejected_reason}`);
  }

  if (order.review_notes) {
    notes.push(`Revisao V1: ${order.review_notes}`);
  }

  return notes.join(" ");
}

function buildPlan(orders, itemsByOrderId, paymentsByOrderId, competencies) {
  const missingCompetenceByCode = new Map();
  const rows = [];
  const issues = {
    noItems: 0,
    partialPayments: 0,
    shippingOrders: 0,
  };

  for (const order of orders) {
    const orderItems = itemsByOrderId.get(order.id) ?? [];
    const orderPayments = paymentsByOrderId.get(order.id) ?? [];
    const paidAmount = sumPayments(paidPayments(orderPayments));
    const originalTotal = roundMoney(order.total ?? 0);
    const partialPayment = paidAmount > 0 && paidAmount + 0.01 < originalTotal;
    const targetTotal = partialPayment ? roundMoney(originalTotal - paidAmount) : originalTotal;
    const orderDate = toDateString(order.created_at);
    let competence = findCompetenceForDate(orderDate, competencies);

    if (!competence) {
      const missing = calendarCompetenceForDate(orderDate);
      competence = missing;
      missingCompetenceByCode.set(missing.code, missing);
    }

    if (activeItems(orderItems).length === 0) {
      issues.noItems += 1;
    }

    if (partialPayment) {
      issues.partialPayments += 1;
    }

    if (Number(order.shipping_amount ?? 0) > 0) {
      issues.shippingOrders += 1;
    }

    const v2Items = buildV2Items(order, orderItems, targetTotal);
    const paymentStatus = paymentStatusFor(order, orderPayments, targetTotal);
    const approvalStatus = approvalStatusFor(order);
    const fulfillmentStatus = fulfillmentStatusFor(order, orderItems, paymentStatus);
    const reviewedAt = order.reviewed_at ?? order.updated_at ?? order.created_at;

    rows.push({
      legacyOrder: order,
      legacyPayments: orderPayments,
      orderRow: {
        approval_status: approvalStatus,
        cancellation_reason: paymentStatus === "cancelado" || paymentStatus === "reembolso_pendente"
          ? "Cancelado no V1 antes da migracao"
          : null,
        competence_id: competence.id,
        coupon_code: order.coupon_code ?? null,
        coupon_id: order.coupon_id ?? null,
        created_at: order.created_at,
        created_by: order.created_by ?? null,
        customer_id: order.customer_id,
        customer_visible: true,
        discount: v2Items.discount,
        fulfillment_status: fulfillmentStatus,
        internal_notes: [order.internal_notes, buildMigrationNotes(order, paidAmount, targetTotal)].filter(Boolean).join("\n\n"),
        legacy_order_id: order.id,
        notes: order.notes ?? null,
        order_date: orderDate,
        order_number: order.order_number,
        paid_at: paymentStatus === "pago"
          ? paidPayments(orderPayments).at(-1)?.paid_at ?? order.updated_at ?? order.created_at
          : null,
        payment_status: paymentStatus,
        refund_notes: paymentStatus === "reembolsado" ? "Reembolso identificado no V1 antes da migracao" : null,
        refund_requested_at: paymentStatus === "reembolso_pendente" ? order.updated_at ?? order.created_at : null,
        refunded_at: paymentStatus === "reembolsado" ? order.updated_at ?? order.created_at : null,
        rejected_at: approvalStatus === "recusado" ? reviewedAt : null,
        rejection_reason: approvalStatus === "recusado" ? order.rejected_reason ?? "Recusado no V1" : null,
        reviewed_at: approvalStatus === "aprovado" ? reviewedAt : null,
        reviewed_by: order.reviewed_by ?? null,
        seller: ["daniel", "allana"].includes(order.seller) ? order.seller : null,
        shipped_at: fulfillmentStatus === "enviado" ? order.updated_at ?? order.created_at : null,
        received_at: fulfillmentStatus === "recebido" ? order.updated_at ?? order.created_at : null,
        requested_at: fulfillmentStatus === "solicitado" ? order.updated_at ?? order.created_at : null,
        source: sourceFromChannel(order.channel),
        subtotal: v2Items.subtotal,
        updated_at: order.updated_at ?? order.created_at,
      },
      paymentStatus,
      v2Items,
    });
  }

  return {
    issues,
    missingCompetencies: Array.from(missingCompetenceByCode.values()),
    rows,
  };
}

function statusCounts(rows, field) {
  return rows.reduce((counts, row) => {
    const value = row.orderRow[field];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function printSummary({ args, currentV2Counts, orders, plan }) {
  const totalV1 = orders.length;
  const totalV2 = plan.rows.length;
  const totalAmount = roundMoney(plan.rows.reduce((sum, row) => sum + Number(row.orderRow.subtotal) - Number(row.orderRow.discount), 0));
  const paidLegacyPayments = plan.rows.flatMap((row) => paidPayments(row.legacyPayments));

  console.log("");
  console.log(args.dryRun ? "DRY-RUN migracao pedidos V1 -> V2" : "EXECUCAO migracao pedidos V1 -> V2");
  console.log("V1 sera preservado. A limpeza, quando habilitada, remove apenas dados de pedidos V2.");
  console.log("");
  console.log(`Pedidos V1 lidos: ${totalV1}`);
  console.log(`Pedidos V2 a criar: ${totalV2}`);
  console.log(`Valor V2 planejado: ${totalAmount.toFixed(2)}`);
  console.log(`Pagamentos V1 pagos a espelhar como sessoes V2: ${paidLegacyPayments.length}`);
  console.log(`Competencias legadas a criar: ${plan.missingCompetencies.length}`);
  console.log(`Pedidos V2 atuais: ${currentV2Counts.orders}`);
  console.log(`Itens V2 atuais: ${currentV2Counts.items}`);
  console.log(`Sessoes V2 atuais: ${currentV2Counts.sessions}`);
  console.log("");
  console.log("Status aprovacao V2:", statusCounts(plan.rows, "approval_status"));
  console.log("Status pagamento V2:", statusCounts(plan.rows, "payment_status"));
  console.log("Status operacao V2:", statusCounts(plan.rows, "fulfillment_status"));
  console.log("");
  console.log(`Pedidos sem itens ativos no V1: ${plan.issues.noItems}`);
  console.log(`Pedidos com pagamento parcial no V1: ${plan.issues.partialPayments}`);
  console.log(`Pedidos com frete legado: ${plan.issues.shippingOrders}`);
  console.log("");

  if (plan.missingCompetencies.length > 0) {
    console.log("Competencias que serao criadas:");
    for (const competence of plan.missingCompetencies) {
      console.log(`- ${competence.code}: ${competence.label} (${competence.starts_on} a ${competence.ends_on})`);
    }
    console.log("");
  }
}

async function getCurrentV2Counts(supabase) {
  const [orders, items, sessions] = await Promise.all([
    supabase.from("v2_orders").select("id", { count: "exact", head: true }),
    supabase.from("v2_order_items").select("id", { count: "exact", head: true }),
    supabase.from("v2_payment_sessions").select("id", { count: "exact", head: true }),
  ]);

  for (const [label, result] of [["v2_orders", orders], ["v2_order_items", items], ["v2_payment_sessions", sessions]]) {
    if (result.error) {
      throw new Error(`${label}: ${result.error.message}`);
    }
  }

  return {
    items: items.count ?? 0,
    orders: orders.count ?? 0,
    sessions: sessions.count ?? 0,
  };
}

async function cleanV2Tables(supabase) {
  const tables = [
    "v2_payment_provider_events",
    "v2_shipments",
    "v2_order_events",
    "v2_payment_session_orders",
    "v2_payment_sessions",
    "v2_order_items",
    "v2_orders",
  ];

  for (const table of tables) {
    await deleteAll(supabase, table);
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(resolve("web/.env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em web/.env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const [orders, items, payments, competencies, currentV2Counts] = await Promise.all([
    fetchAll(
      supabase,
      "orders",
      `
        id,order_number,customer_id,channel,status,subtotal,discount,shipping_amount,total,coupon_id,coupon_code,
        public_tracking_enabled,seller,notes,internal_notes,created_by,created_at,updated_at,
        review_status,review_notes,rejected_reason,reviewed_by,reviewed_at,
        payment_provider,payment_link_url,payment_provider_reference,paid_installments,provider_payment_method,provider_fee_amount
      `,
      { limit: args.limit, order: { ascending: true, column: "created_at" } },
    ),
    fetchAll(
      supabase,
      "order_items",
      `
        id,order_id,product_variant_id,quantity,unit_price,total_price,source,status,created_at,updated_at,
        product_variants(sku,products(name))
      `,
      { limit: null, order: { ascending: true, column: "created_at" } },
    ),
    fetchAll(
      supabase,
      "payments",
      `
        id,order_id,customer_id,method,amount,fee_amount,net_amount,status,paid_at,created_by,created_at,
        provider,provider_reference,payment_link_url,paid_installments,provider_payment_method,provider_fee_amount,provider_payload
      `,
      { limit: null, order: { ascending: true, column: "created_at" } },
    ),
    fetchAll(
      supabase,
      "v2_order_competencies",
      "id,code,label,starts_on,ends_on,status,notes",
      { limit: null, order: { ascending: true, column: "starts_on" } },
    ),
    getCurrentV2Counts(supabase),
  ]);

  const itemsByOrderId = new Map();
  const paymentsByOrderId = new Map();

  for (const item of items) {
    const rows = itemsByOrderId.get(item.order_id) ?? [];
    rows.push(item);
    itemsByOrderId.set(item.order_id, rows);
  }

  for (const payment of payments) {
    const rows = paymentsByOrderId.get(payment.order_id) ?? [];
    rows.push(payment);
    paymentsByOrderId.set(payment.order_id, rows);
  }

  const plan = buildPlan(orders, itemsByOrderId, paymentsByOrderId, competencies);
  printSummary({ args, currentV2Counts, orders, plan });

  if (args.dryRun) {
    console.log("Nenhuma alteracao aplicada. Rode com --execute para migrar.");
    return;
  }

  if (args.cleanV2) {
    await cleanV2Tables(supabase);
  }

  const createdCompetencies = plan.missingCompetencies.length > 0
    ? await upsertChunked(
        supabase,
        "v2_order_competencies",
        plan.missingCompetencies,
        { onConflict: "code" },
        "id,code,label,starts_on,ends_on,status,notes",
      )
    : [];
  const allCompetencies = [...competencies, ...createdCompetencies];

  for (const row of plan.rows) {
    if (typeof row.orderRow.competence_id === "undefined") {
      const orderDate = row.orderRow.order_date;
      const competence = findCompetenceForDate(orderDate, allCompetencies);

      if (!competence) {
        throw new Error(`Competencia nao encontrada para ${row.legacyOrder.order_number} (${orderDate})`);
      }

      row.orderRow.competence_id = competence.id;
    }
  }

  const insertedOrders = await insertChunked(
    supabase,
    "v2_orders",
    plan.rows.map((row) => row.orderRow),
    "id,order_number,legacy_order_id,customer_id,competence_id,total",
  );
  const v2OrderByLegacyId = new Map(insertedOrders.map((order) => [order.legacy_order_id, order]));
  const itemRows = [];

  for (const row of plan.rows) {
    const v2Order = v2OrderByLegacyId.get(row.legacyOrder.id);

    if (!v2Order) {
      throw new Error(`Pedido V2 nao retornado para ${row.legacyOrder.order_number}`);
    }

    itemRows.push(...row.v2Items.rows.map((item) => ({
      legacy_order_item_id: item.legacyOrderItemId,
      order_id: v2Order.id,
      product_name: item.productName,
      product_sku: item.productSku,
      product_variant_id: item.productVariantId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })));
  }

  await insertChunked(supabase, "v2_order_items", itemRows);

  const eventRows = plan.rows.map((row) => {
    const v2Order = v2OrderByLegacyId.get(row.legacyOrder.id);

    return {
      customer_id: row.legacyOrder.customer_id,
      event_type: "migration.v1_imported",
      metadata: {
        legacyOrderId: row.legacyOrder.id,
        legacyOrderNumber: row.legacyOrder.order_number,
        legacyReviewStatus: row.legacyOrder.review_status,
        legacyStatus: row.legacyOrder.status,
      },
      notes: "Pedido duplicado do V1 para o V2. O registro V1 foi preservado.",
      order_id: v2Order.id,
      to_status: `${row.orderRow.approval_status}/${row.orderRow.payment_status}/${row.orderRow.fulfillment_status}`,
    };
  });

  await insertChunked(supabase, "v2_order_events", eventRows);

  const paidPaymentRows = [];

  for (const row of plan.rows) {
    const v2Order = v2OrderByLegacyId.get(row.legacyOrder.id);

    for (const payment of paidPayments(row.legacyPayments)) {
      paidPaymentRows.push({
        amount: roundMoney(payment.amount),
        checkout_number: `LEGACY-${row.legacyOrder.order_number}-${payment.id.slice(0, 8).toUpperCase()}`,
        competence_id: v2Order.competence_id,
        created_at: payment.created_at,
        created_by: payment.created_by ?? null,
        customer_id: payment.customer_id,
        legacy_payment_id: payment.id,
        paid_amount: roundMoney(payment.amount),
        paid_at: payment.paid_at ?? payment.created_at,
        paid_installments: payment.paid_installments ?? row.legacyOrder.paid_installments ?? null,
        payment_link_url: payment.payment_link_url ?? row.legacyOrder.payment_link_url ?? null,
        provider: payment.provider ?? row.legacyOrder.payment_provider ?? String(payment.method ?? "legacy"),
        provider_fee_amount: payment.provider_fee_amount ?? payment.fee_amount ?? row.legacyOrder.provider_fee_amount ?? null,
        provider_payload: payment.provider_payload ?? null,
        provider_reference: payment.provider_reference ?? row.legacyOrder.payment_provider_reference ?? null,
        status: "paid",
      });
    }
  }

  const insertedSessions = paidPaymentRows.length > 0
    ? await insertChunked(
        supabase,
        "v2_payment_sessions",
        paidPaymentRows,
        "id,legacy_payment_id,amount",
      )
    : [];
  const sessionByLegacyPaymentId = new Map(insertedSessions.map((session) => [session.legacy_payment_id, session]));
  const paymentLinks = [];

  for (const row of plan.rows) {
    const v2Order = v2OrderByLegacyId.get(row.legacyOrder.id);

    for (const payment of paidPayments(row.legacyPayments)) {
      const session = sessionByLegacyPaymentId.get(payment.id);

      if (session) {
        paymentLinks.push({
          amount: roundMoney(payment.amount),
          order_id: v2Order.id,
          payment_session_id: session.id,
        });
      }
    }
  }

  if (paymentLinks.length > 0) {
    await insertChunked(supabase, "v2_payment_session_orders", paymentLinks);
  }

  console.log("Migracao concluida.");
  console.log(`Pedidos V2 criados: ${insertedOrders.length}`);
  console.log(`Itens V2 criados: ${itemRows.length}`);
  console.log(`Sessoes de pagamento V2 criadas: ${insertedSessions.length}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
