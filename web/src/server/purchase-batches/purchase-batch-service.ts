import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const purchaseBatchStatusSchema = z.enum([
  "draft",
  "open",
  "closed",
  "purchased",
  "in_transit",
  "received",
  "cancelled",
]);

export const purchaseBatchTypeSchema = z.enum(["national", "international", "collab", "other"]);

export const purchaseBatchItemStatusSchema = z.enum([
  "planned",
  "approved",
  "purchased",
  "in_transit",
  "received",
  "cancelled",
]);

const nullableTextSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().nullable().optional(),
);

const nullableNumberSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined) {
      return null;
    }

    return value;
  },
  z.number().nonnegative().nullable().optional(),
);

export const createPurchaseBatchSchema = z.object({
  code: z.string().trim().min(2).optional(),
  description: nullableTextSchema,
  estimatedPurchaseCost: z.number().nonnegative().default(0),
  estimatedShippingCost: z.number().nonnegative().default(0),
  estimatedTaxesCost: z.number().nonnegative().default(0),
  estimatedTotalCost: z.number().nonnegative().optional(),
  name: z.string().trim().min(2),
  notes: nullableTextSchema,
  supplierId: z.string().uuid().nullable().optional(),
  type: purchaseBatchTypeSchema.default("national"),
});

export const updatePurchaseBatchSchema = createPurchaseBatchSchema.partial().extend({
  actualPurchaseCost: nullableNumberSchema,
  actualShippingCost: nullableNumberSchema,
  actualTaxesCost: nullableNumberSchema,
  actualTotalCost: nullableNumberSchema,
  status: purchaseBatchStatusSchema.optional(),
});

export const changePurchaseBatchStatusSchema = z.object({
  notes: nullableTextSchema,
  status: purchaseBatchStatusSchema,
});

export const addBatchItemSchema = z.object({
  actualTotalCost: nullableNumberSchema,
  actualUnitCost: nullableNumberSchema,
  estimatedTotalCost: nullableNumberSchema,
  estimatedUnitCost: nullableNumberSchema,
  expectedArrivalDate: z.string().date().nullable().optional(),
  notes: nullableTextSchema,
  quantity: z.number().int().positive().optional(),
  status: purchaseBatchItemStatusSchema.optional(),
});

export const updateBatchItemSchema = addBatchItemSchema.partial();

export const receivePurchaseBatchSchema = z.object({
  actualPurchaseCost: nullableNumberSchema,
  actualShippingCost: nullableNumberSchema,
  actualTaxesCost: nullableNumberSchema,
  actualTotalCost: nullableNumberSchema,
  notes: nullableTextSchema,
});

export type CreatePurchaseBatchInput = z.infer<typeof createPurchaseBatchSchema>;
export type UpdatePurchaseBatchInput = z.infer<typeof updatePurchaseBatchSchema>;
export type AddBatchItemInput = z.infer<typeof addBatchItemSchema>;
export type UpdateBatchItemInput = z.infer<typeof updateBatchItemSchema>;
export type ReceivePurchaseBatchInput = z.infer<typeof receivePurchaseBatchSchema>;
export type PurchaseBatchStatus = z.infer<typeof purchaseBatchStatusSchema>;

export type PurchaseBatchFilters = {
  limit?: number;
  q?: string;
  status?: string;
  supplierId?: string;
  type?: string;
};

export type EligibleOrderItemFilters = {
  customerId?: string;
  limit?: number;
  orderFinancialStatus?: string;
  orderId?: string;
  productId?: string;
  productVariantId?: string;
  q?: string;
  status?: string;
  supplierId?: string;
};

type PurchaseBatchRow = {
  id: string;
  status: string;
};

type OrderItemRow = {
  id: string;
  cost_estimate?: number | string | null;
  final_cost?: number | string | null;
  order_id: string;
  product_variant_id: string;
  quantity: number;
  status: string;
  total_price: number | string;
  unit_price: number | string;
  orders?: {
    customer_id?: string | null;
    id?: string;
    order_number?: string;
    status?: string;
    total?: number | string;
    customers?: {
      email?: string | null;
      id?: string;
      name?: string | null;
      phone?: string | null;
    } | null;
    payments?: Array<{
      amount?: number | string;
      status?: string;
    }>;
  } | null;
  product_variants?: {
    id?: string;
    product_id?: string | null;
    sku?: string | null;
    products?: {
      id?: string;
      name?: string | null;
      slug?: string | null;
      supplier_id?: string | null;
      suppliers?: {
        id?: string;
        name?: string | null;
      } | null;
    } | null;
  } | null;
};

const activeBatchStatuses = ["draft", "open", "closed", "purchased", "in_transit"];
const eligibleOrderItemStatuses = ["requested", "waiting_payment", "paid", "waiting_purchase", "approved"];
const allowedTransitions: Record<string, PurchaseBatchStatus[]> = {
  closed: ["purchased", "cancelled"],
  draft: ["open", "cancelled"],
  in_transit: ["received"],
  open: ["closed", "cancelled"],
  purchased: ["in_transit"],
};
const statusTimestampColumns: Partial<Record<PurchaseBatchStatus, string>> = {
  cancelled: "cancelled_at",
  closed: "closed_at",
  in_transit: "shipped_at",
  open: "opened_at",
  purchased: "purchased_at",
  received: "received_at",
};
const batchItemStatusByBatchStatus: Partial<Record<PurchaseBatchStatus, string>> = {
  in_transit: "in_transit",
  purchased: "purchased",
  received: "received",
};

function purchaseBatchSelect() {
  return `
    id,code,name,description,type,status,supplier_id,
    estimated_purchase_cost,estimated_shipping_cost,estimated_taxes_cost,estimated_total_cost,
    actual_purchase_cost,actual_shipping_cost,actual_taxes_cost,actual_total_cost,
    opened_at,closed_at,purchased_at,shipped_at,received_at,cancelled_at,
    notes,created_by,updated_by,created_at,updated_at,
    suppliers(id,name,slug),
    purchase_batch_items(id,status,quantity,estimated_total_cost,actual_total_cost)
  `;
}

function purchaseBatchDetailSelect() {
  return `
    id,code,name,description,type,status,supplier_id,
    estimated_purchase_cost,estimated_shipping_cost,estimated_taxes_cost,estimated_total_cost,
    actual_purchase_cost,actual_shipping_cost,actual_taxes_cost,actual_total_cost,
    opened_at,closed_at,purchased_at,shipped_at,received_at,cancelled_at,
    notes,created_by,updated_by,created_at,updated_at,
    suppliers(id,name,slug),
    purchase_batch_items(
      id,purchase_batch_id,order_id,order_item_id,product_id,product_variant_id,customer_id,
      quantity,status,estimated_unit_cost,actual_unit_cost,estimated_total_cost,actual_total_cost,
      expected_arrival_date,received_at,notes,created_at,updated_at,
      orders(id,order_number,status,total,customers(id,name,email,phone),payments(amount,status)),
      order_items(id,status,unit_price,total_price,source),
      product_variants(id,sku,products(id,name,slug,supplier_id,suppliers(id,name))),
      customers(id,name,email,phone)
    )
  `;
}

function orderItemSelect() {
  return `
    id,order_id,product_variant_id,quantity,unit_price,total_price,source,status,cost_estimate,final_cost,created_at,updated_at,
    orders(id,order_number,status,total,customer_id,customers(id,name,email,phone),payments(amount,status)),
    product_variants(id,sku,product_id,products(id,name,slug,supplier_id,suppliers(id,name)))
  `;
}

function escapeIlike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_").trim();
}

function normalizeSearch(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function nullableNumber(value: number | string | null | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

function createBatchCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOT-${date}-${suffix}`;
}

function estimateTotal(input: {
  estimatedPurchaseCost?: number;
  estimatedShippingCost?: number;
  estimatedTaxesCost?: number;
  estimatedTotalCost?: number;
}) {
  return input.estimatedTotalCost ?? (
    Number(input.estimatedPurchaseCost ?? 0) +
    Number(input.estimatedShippingCost ?? 0) +
    Number(input.estimatedTaxesCost ?? 0)
  );
}

function paidAmount(order: OrderItemRow["orders"]) {
  return (order?.payments ?? [])
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
}

function matchesSearch(item: OrderItemRow, search: string) {
  if (!search) {
    return true;
  }

  const order = item.orders;
  const product = item.product_variants?.products;
  const customer = order?.customers;
  return [
    item.id,
    order?.order_number ?? "",
    customer?.name ?? "",
    customer?.email ?? "",
    product?.name ?? "",
    item.product_variants?.sku ?? "",
  ].some((entry) => entry.toLowerCase().includes(search));
}

export class PurchaseBatchService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listPurchaseBatches(filters: PurchaseBatchFilters = {}) {
    const limit = Math.min(500, Math.max(1, Number(filters.limit ?? 200)));
    let query = this.supabase
      .from("purchase_batches")
      .select(purchaseBatchSelect())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.supplierId) {
      query = query.eq("supplier_id", filters.supplierId);
    }

    if (filters.q?.trim()) {
      const safeSearch = escapeIlike(filters.q);
      query = query.or(`code.ilike.%${safeSearch}%,name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar lotes");
    }

    return data ?? [];
  }

  async getPurchaseBatchById(id: string) {
    const { data, error } = await this.supabase
      .from("purchase_batches")
      .select(purchaseBatchDetailSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar lote");
    }

    if (!data) {
      throw notFound("Lote nao encontrado");
    }

    return data;
  }

  async createPurchaseBatch(input: CreatePurchaseBatchInput, actorProfileId = this.actorId) {
    const total = estimateTotal(input);
    const { data, error } = await this.supabase
      .from("purchase_batches")
      .insert({
        code: input.code ?? createBatchCode(),
        created_by: actorProfileId ?? null,
        description: input.description ?? null,
        estimated_purchase_cost: input.estimatedPurchaseCost,
        estimated_shipping_cost: input.estimatedShippingCost,
        estimated_taxes_cost: input.estimatedTaxesCost,
        estimated_total_cost: total,
        name: input.name,
        notes: input.notes ?? null,
        status: "draft",
        supplier_id: input.supplierId ?? null,
        type: input.type,
        updated_by: actorProfileId ?? null,
      })
      .select(purchaseBatchSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar lote");
    }

    const created = data as unknown as Record<string, unknown> & { id: string };

    await this.audit.createAdminActionLog({
      action: "purchase_batch.create",
      adminId: actorProfileId,
      entityId: created.id,
      entityType: "purchase_batch",
      newValue: created,
    });

    return created;
  }

  async updatePurchaseBatch(id: string, input: UpdatePurchaseBatchInput, actorProfileId = this.actorId) {
    const current = await this.getPurchaseBatchById(id) as unknown as PurchaseBatchRow;

    if (current.status === "cancelled") {
      throw conflict("Lote cancelado nao pode ser editado");
    }

    const update = withoutUndefined({
      actual_purchase_cost: input.actualPurchaseCost,
      actual_shipping_cost: input.actualShippingCost,
      actual_taxes_cost: input.actualTaxesCost,
      actual_total_cost: input.actualTotalCost,
      code: input.code,
      description: input.description,
      estimated_purchase_cost: input.estimatedPurchaseCost,
      estimated_shipping_cost: input.estimatedShippingCost,
      estimated_taxes_cost: input.estimatedTaxesCost,
      estimated_total_cost: input.estimatedTotalCost ?? (
        input.estimatedPurchaseCost !== undefined ||
        input.estimatedShippingCost !== undefined ||
        input.estimatedTaxesCost !== undefined
          ? estimateTotal(input)
          : undefined
      ),
      name: input.name,
      notes: input.notes,
      status: input.status,
      supplier_id: input.supplierId,
      type: input.type,
      updated_by: actorProfileId ?? null,
    });

    const { data, error } = await this.supabase
      .from("purchase_batches")
      .update(update)
      .eq("id", id)
      .select(purchaseBatchSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar lote");
    }

    const updated = data as unknown as Record<string, unknown>;

    await this.audit.createAdminActionLog({
      action: "purchase_batch.update",
      adminId: actorProfileId,
      entityId: id,
      entityType: "purchase_batch",
      newValue: updated,
      oldValue: current,
    });

    return updated;
  }

  async changePurchaseBatchStatus(
    id: string,
    status: PurchaseBatchStatus,
    actorProfileId = this.actorId,
    notes?: string | null,
  ) {
    const current = await this.getPurchaseBatchById(id) as unknown as PurchaseBatchRow;

    if (current.status === "cancelled") {
      throw conflict("Lote cancelado nao pode mudar de status");
    }

    if (current.status === status) {
      return current;
    }

    const allowed = allowedTransitions[current.status] ?? [];
    if (!allowed.includes(status)) {
      throw conflict("Transicao de status nao permitida para este lote");
    }

    const now = new Date().toISOString();
    const timestampColumn = statusTimestampColumns[status];
    const update = withoutUndefined({
      [timestampColumn ?? "updated_at"]: timestampColumn ? now : undefined,
      status,
      updated_by: actorProfileId ?? null,
    });

    const { data, error } = await this.supabase
      .from("purchase_batches")
      .update(update)
      .eq("id", id)
      .select(purchaseBatchSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao mudar status do lote");
    }

    const itemStatus = batchItemStatusByBatchStatus[status];
    if (itemStatus) {
      const itemUpdate: Record<string, unknown> = { status: itemStatus };
      if (status === "received") {
        itemUpdate.received_at = now;
      }

      const { error: itemsError } = await this.supabase
        .from("purchase_batch_items")
        .update(itemUpdate)
        .eq("purchase_batch_id", id)
        .neq("status", "cancelled");

      if (itemsError) {
        throwQueryError(itemsError, "Falha ao atualizar itens do lote");
      }
    }

    const updated = data as unknown as Record<string, unknown>;

    await this.audit.createAdminActionLog({
      action: "purchase_batch.status_update",
      adminId: actorProfileId,
      entityId: id,
      entityType: "purchase_batch",
      newValue: { notes: notes ?? null, status },
      oldValue: current,
    });

    return updated;
  }

  async listEligibleOrderItems(filters: EligibleOrderItemFilters = {}) {
    const limit = Math.min(500, Math.max(1, Number(filters.limit ?? 300)));
    const { data: activeBatchItems, error: batchItemsError } = await this.supabase
      .from("purchase_batch_items")
      .select("order_item_id,purchase_batches!inner(status)")
      .not("order_item_id", "is", null)
      .neq("status", "cancelled")
      .in("purchase_batches.status", activeBatchStatuses);

    if (batchItemsError) {
      throwQueryError(batchItemsError, "Falha ao validar itens ja vinculados a lotes");
    }

    const activeOrderItemIds = new Set((activeBatchItems ?? []).map((item) => item.order_item_id).filter(Boolean));

    let query = this.supabase
      .from("order_items")
      .select(orderItemSelect())
      .neq("status", "cancelled")
      .limit(limit);

    const status = filters.status?.trim();
    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.in("status", eligibleOrderItemStatuses);
    }

    if (filters.orderId) {
      query = query.eq("order_id", filters.orderId);
    }

    if (filters.productVariantId) {
      query = query.eq("product_variant_id", filters.productVariantId);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar itens elegiveis");
    }

    const search = normalizeSearch(filters.q);
    return ((data ?? []) as unknown as OrderItemRow[])
      .filter((item) => !activeOrderItemIds.has(item.id))
      .filter((item) => !filters.customerId || item.orders?.customer_id === filters.customerId)
      .filter((item) => !filters.orderFinancialStatus || item.orders?.status === filters.orderFinancialStatus)
      .filter((item) => !filters.productId || item.product_variants?.product_id === filters.productId)
      .filter((item) => !filters.supplierId || item.product_variants?.products?.supplier_id === filters.supplierId)
      .filter((item) => matchesSearch(item, search))
      .map((item) => ({
        ...item,
        paid_amount: paidAmount(item.orders),
        pending_amount: Math.max(0, Number(item.orders?.total ?? 0) - paidAmount(item.orders)),
      }))
      .sort((first, second) => {
        const firstPaid = Number(first.paid_amount ?? 0) > 0 ? 1 : 0;
        const secondPaid = Number(second.paid_amount ?? 0) > 0 ? 1 : 0;
        return secondPaid - firstPaid;
      });
  }

  async listBatchItemsForOrder(orderId: string) {
    const { data, error } = await this.supabase
      .from("purchase_batch_items")
      .select(`
        id,order_item_id,status,purchase_batch_id,
        purchase_batches(id,code,name,status)
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar lotes vinculados ao pedido");
    }

    return data ?? [];
  }

  async addOrderItemToBatch(
    batchId: string,
    orderItemId: string,
    input: AddBatchItemInput,
    actorProfileId = this.actorId,
  ) {
    const batch = await this.getEditableBatch(batchId);
    const orderItem = await this.getOrderItemForBatch(orderItemId);

    if (orderItem.status === "cancelled") {
      throw conflict("Item cancelado nao pode entrar em lote");
    }

    const { data: existingInBatch, error: duplicateError } = await this.supabase
      .from("purchase_batch_items")
      .select("id")
      .eq("purchase_batch_id", batchId)
      .eq("order_item_id", orderItemId)
      .maybeSingle();

    if (duplicateError) {
      throwQueryError(duplicateError, "Falha ao validar item duplicado no lote");
    }

    if (existingInBatch) {
      throw conflict("Item ja esta neste lote");
    }

    const { data: existingActive, error: activeError } = await this.supabase
      .from("purchase_batch_items")
      .select("id,purchase_batch_id,purchase_batches!inner(status)")
      .eq("order_item_id", orderItemId)
      .neq("status", "cancelled")
      .in("purchase_batches.status", activeBatchStatuses)
      .maybeSingle();

    if (activeError) {
      throwQueryError(activeError, "Falha ao validar lote ativo do item");
    }

    if (existingActive) {
      throw conflict("Item ja esta vinculado a outro lote ativo");
    }

    const estimatedUnitCost = nullableNumber(input.estimatedUnitCost) ?? nullableNumber(orderItem.cost_estimate);
    const actualUnitCost = nullableNumber(input.actualUnitCost) ?? nullableNumber(orderItem.final_cost);
    const quantity = input.quantity ?? orderItem.quantity;
    const { data, error } = await this.supabase
      .from("purchase_batch_items")
      .insert({
        actual_total_cost: input.actualTotalCost ?? (actualUnitCost === null ? null : actualUnitCost * quantity),
        actual_unit_cost: actualUnitCost,
        customer_id: orderItem.orders?.customer_id ?? null,
        estimated_total_cost: input.estimatedTotalCost ?? (estimatedUnitCost === null ? null : estimatedUnitCost * quantity),
        estimated_unit_cost: estimatedUnitCost,
        expected_arrival_date: input.expectedArrivalDate ?? null,
        notes: input.notes ?? null,
        order_id: orderItem.order_id,
        order_item_id: orderItem.id,
        product_id: orderItem.product_variants?.product_id ?? null,
        product_variant_id: orderItem.product_variant_id,
        purchase_batch_id: batchId,
        quantity,
        status: input.status ?? "planned",
      })
      .select("id,purchase_batch_id,order_item_id,status,quantity,estimated_total_cost,actual_total_cost")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao adicionar item ao lote");
    }

    const created = data as unknown as Record<string, unknown> & { id: string };

    await this.audit.createAdminActionLog({
      action: "purchase_batch_item.add",
      adminId: actorProfileId,
      entityId: created.id,
      entityType: "purchase_batch_item",
      newValue: { ...created, batchStatus: batch.status },
    });

    return created;
  }

  async removeItemFromBatch(batchId: string, batchItemId: string, actorProfileId = this.actorId) {
    await this.getEditableBatch(batchId);
    const current = await this.getBatchItem(batchId, batchItemId);
    const { error } = await this.supabase
      .from("purchase_batch_items")
      .delete()
      .eq("purchase_batch_id", batchId)
      .eq("id", batchItemId);

    if (error) {
      throwQueryError(error, "Falha ao remover item do lote");
    }

    await this.audit.createAdminActionLog({
      action: "purchase_batch_item.remove",
      adminId: actorProfileId,
      entityId: batchItemId,
      entityType: "purchase_batch_item",
      oldValue: current,
    });
  }

  async updateBatchItem(
    batchId: string,
    batchItemId: string,
    input: UpdateBatchItemInput,
    actorProfileId = this.actorId,
  ) {
    await this.getEditableBatch(batchId);
    const current = await this.getBatchItem(batchId, batchItemId);
    const quantity = input.quantity ?? Number(current.quantity ?? 1);
    const update = withoutUndefined({
      actual_total_cost: input.actualTotalCost,
      actual_unit_cost: input.actualUnitCost,
      estimated_total_cost: input.estimatedTotalCost,
      estimated_unit_cost: input.estimatedUnitCost,
      expected_arrival_date: input.expectedArrivalDate,
      notes: input.notes,
      quantity: input.quantity,
      received_at: input.status === "received" ? new Date().toISOString() : undefined,
      status: input.status,
    });

    if (input.estimatedTotalCost === undefined && input.estimatedUnitCost !== undefined) {
      update.estimated_total_cost = nullableNumber(input.estimatedUnitCost) === null
        ? null
        : Number(input.estimatedUnitCost) * quantity;
    }

    if (input.actualTotalCost === undefined && input.actualUnitCost !== undefined) {
      update.actual_total_cost = nullableNumber(input.actualUnitCost) === null
        ? null
        : Number(input.actualUnitCost) * quantity;
    }

    const { data, error } = await this.supabase
      .from("purchase_batch_items")
      .update(update)
      .eq("purchase_batch_id", batchId)
      .eq("id", batchItemId)
      .select("id,purchase_batch_id,order_item_id,status,quantity,estimated_total_cost,actual_total_cost")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar item do lote");
    }

    const updated = data as unknown as Record<string, unknown>;

    await this.audit.createAdminActionLog({
      action: "purchase_batch_item.update",
      adminId: actorProfileId,
      entityId: batchItemId,
      entityType: "purchase_batch_item",
      newValue: updated,
      oldValue: current,
    });

    return updated;
  }

  async receiveBatch(batchId: string, input: ReceivePurchaseBatchInput, actorProfileId = this.actorId) {
    const current = await this.getPurchaseBatchById(batchId) as unknown as PurchaseBatchRow;

    if (current.status === "cancelled") {
      throw conflict("Lote cancelado nao pode ser recebido");
    }

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("purchase_batches")
      .update(withoutUndefined({
        actual_purchase_cost: input.actualPurchaseCost,
        actual_shipping_cost: input.actualShippingCost,
        actual_taxes_cost: input.actualTaxesCost,
        actual_total_cost: input.actualTotalCost,
        received_at: now,
        status: "received",
        updated_by: actorProfileId ?? null,
      }))
      .eq("id", batchId)
      .select(purchaseBatchSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao receber lote");
    }

    const { data: items, error: itemsError } = await this.supabase
      .from("purchase_batch_items")
      .update({
        received_at: now,
        status: "received",
      })
      .eq("purchase_batch_id", batchId)
      .neq("status", "cancelled")
      .select("id,order_item_id,product_variant_id,quantity,status");

    if (itemsError) {
      throwQueryError(itemsError, "Falha ao receber itens do lote");
    }

    const orderItemIds = (items ?? []).map((item) => item.order_item_id).filter(Boolean);
    if (orderItemIds.length > 0) {
      const { error: orderItemsError } = await this.supabase
        .from("order_items")
        .update({ status: "received" })
        .in("id", orderItemIds)
        .neq("status", "cancelled");

      if (orderItemsError) {
        throwQueryError(orderItemsError, "Falha ao atualizar itens de pedido recebidos");
      }
    }

    await this.audit.createAdminActionLog({
      action: "purchase_batch.receive",
      adminId: actorProfileId,
      entityId: batchId,
      entityType: "purchase_batch",
      newValue: { batch: data, items, notes: input.notes ?? null },
      oldValue: current,
    });

    return {
      batch: data,
      items: items ?? [],
    };
  }

  private async getEditableBatch(batchId: string) {
    const batch = await this.getPurchaseBatchById(batchId) as unknown as PurchaseBatchRow;

    if (batch.status === "cancelled") {
      throw conflict("Lote cancelado nao pode ser editado");
    }

    if (batch.status === "received") {
      throw conflict("Lote recebido nao pode ser editado");
    }

    return batch;
  }

  private async getOrderItemForBatch(orderItemId: string) {
    const { data, error } = await this.supabase
      .from("order_items")
      .select(orderItemSelect())
      .eq("id", orderItemId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar item de pedido");
    }

    if (!data) {
      throw notFound("Item de pedido nao encontrado");
    }

    const item = data as unknown as OrderItemRow;

    if (!item.product_variant_id) {
      throw badRequest("Item de pedido sem variante de produto");
    }

    return item;
  }

  private async getBatchItem(batchId: string, batchItemId: string) {
    const { data, error } = await this.supabase
      .from("purchase_batch_items")
      .select("id,purchase_batch_id,order_id,order_item_id,product_id,product_variant_id,customer_id,quantity,status,estimated_unit_cost,actual_unit_cost,estimated_total_cost,actual_total_cost,expected_arrival_date,received_at,notes")
      .eq("purchase_batch_id", batchId)
      .eq("id", batchItemId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar item do lote");
    }

    if (!data) {
      throw notFound("Item do lote nao encontrado");
    }

    return data as unknown as Record<string, unknown>;
  }
}
