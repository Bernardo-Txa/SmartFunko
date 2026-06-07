import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import {
  InventoryMovementService,
  type CreateInventoryMovementInput,
  type InventoryMovementFilters,
  type InventoryMovementType,
} from "@/server/inventory/inventory-movement-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const inventoryStatusSchema = z.enum([
  "available",
  "reserved",
  "sold",
  "in_transit",
  "damaged",
  "unavailable",
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

export const addInventoryItemSchema = z.object({
  productVariantId: z.string().uuid(),
  sku: z.string().trim().min(2),
  status: inventoryStatusSchema.default("available"),
  location: nullableTextSchema,
  purchaseCost: z.number().nonnegative().optional().nullable(),
  landedCost: z.number().nonnegative().optional().nullable(),
  notes: nullableTextSchema,
});

export const adjustInventoryItemSchema = z
  .object({
    status: inventoryStatusSchema.optional(),
    location: nullableTextSchema,
    purchaseCost: z.number().nonnegative().optional().nullable(),
    landedCost: z.number().nonnegative().optional().nullable(),
    notes: z.string().trim().min(3, "Informe uma justificativa para o ajuste"),
  })
  .refine(
    (input) =>
      input.status !== undefined ||
      input.location !== undefined ||
      input.purchaseCost !== undefined ||
      input.landedCost !== undefined,
    {
      message: "Informe ao menos um campo para ajuste",
    },
  );

export type AddInventoryItemInput = z.infer<typeof addInventoryItemSchema>;
export type AdjustInventoryItemInput = z.infer<typeof adjustInventoryItemSchema>;

export type InventoryListFilters = {
  damaged?: boolean;
  inTransit?: boolean;
  limit?: number;
  location?: string;
  reserved?: boolean;
  search?: string;
  sold?: boolean;
  status?: string;
};

export type InventoryItemRow = {
  id: string;
  product_variant_id: string;
  sku: string;
  status: string;
  location?: string | null;
  purchase_cost?: number | string | null;
  landed_cost?: number | string | null;
  reserved_for_order_item_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  product_variants?: {
    id?: string;
    product_id?: string;
    sku?: string;
    products?: {
      id?: string;
      name?: string;
      slug?: string;
    } | null;
  } | null;
  reserved_order_item?: ReservedOrderItemRow | null;
};

type ReservedOrderItemRow = {
  id: string;
  order_id: string;
  status: string;
  orders?: {
    id?: string;
    order_number?: string;
    status?: string;
  } | null;
};

type OrderItemForReservation = {
  id: string;
  inventory_item_id: string | null;
  order_id: string;
  product_variant_id: string;
  status: string;
};

type InventoryMutationOptions = {
  notes?: string | null;
  type?: InventoryMovementType;
};

function inventorySelect() {
  return `
    id,product_variant_id,sku,status,location,purchase_cost,landed_cost,reserved_for_order_item_id,notes,created_at,updated_at,
    product_variants(id,sku,product_id,products(id,name,slug))
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

function sameNumber(first: number | string | null | undefined, second: number | string | null | undefined) {
  const firstNumber = nullableNumber(first);
  const secondNumber = nullableNumber(second);
  return firstNumber === secondNumber;
}

function hasMeaningfulChange(current: InventoryItemRow, input: AdjustInventoryItemInput) {
  return (
    (input.status !== undefined && input.status !== current.status) ||
    (input.location !== undefined && input.location !== (current.location ?? null)) ||
    (input.purchaseCost !== undefined && !sameNumber(input.purchaseCost, current.purchase_cost)) ||
    (input.landedCost !== undefined && !sameNumber(input.landedCost, current.landed_cost))
  );
}

function getAdjustmentMovementType(current: InventoryItemRow, input: AdjustInventoryItemInput): InventoryMovementType {
  const statusChanged = input.status !== undefined && input.status !== current.status;
  const locationChanged = input.location !== undefined && input.location !== (current.location ?? null);
  const purchaseCostChanged = input.purchaseCost !== undefined && !sameNumber(input.purchaseCost, current.purchase_cost);
  const landedCostChanged = input.landedCost !== undefined && !sameNumber(input.landedCost, current.landed_cost);
  const costChanged = purchaseCostChanged || landedCostChanged;

  if (statusChanged && input.status === "damaged") {
    return "damaged";
  }

  if (statusChanged && input.status === "unavailable") {
    return "unavailable";
  }

  if (statusChanged && current.status === "in_transit" && input.status === "available") {
    return "received";
  }

  if (!statusChanged && locationChanged && !costChanged) {
    return "location_change";
  }

  if (!statusChanged && !locationChanged && costChanged) {
    return "cost_adjustment";
  }

  return "manual_adjustment";
}

function shouldClearReservation(current: InventoryItemRow, nextStatus: string | undefined) {
  return current.status === "reserved" && nextStatus !== undefined && nextStatus !== "reserved";
}

export class InventoryService {
  private readonly audit: AuditLogService;
  private readonly movements: InventoryMovementService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
    this.movements = new InventoryMovementService(this.supabase);
  }

  async listInventory(filters: InventoryListFilters = {}) {
    const limit = Math.min(500, Math.max(1, Number(filters.limit ?? 300)));
    let query = this.supabase
      .from("inventory_items")
      .select(inventorySelect())
      .order("created_at", { ascending: false })
      .limit(limit);

    const statusFilter =
      filters.status ||
      (filters.reserved ? "reserved" : undefined) ||
      (filters.sold ? "sold" : undefined) ||
      (filters.damaged ? "damaged" : undefined) ||
      (filters.inTransit ? "in_transit" : undefined);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (filters.location?.trim()) {
      query = query.ilike("location", `%${escapeIlike(filters.location)}%`);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar estoque");
    }

    const search = normalizeSearch(filters.search);
    const items = await this.attachReservedOrderItems((data ?? []) as unknown as InventoryItemRow[]);

    if (!search) {
      return items;
    }

    return items.filter((item) => {
      const productName = item.product_variants?.products?.name ?? "";
      const variantSku = item.product_variants?.sku ?? "";
      return [item.sku, variantSku, productName]
        .some((entry) => entry.toLowerCase().includes(search));
    });
  }

  async listInventoryForProduct(productId: string) {
    const { data: variants, error: variantsError } = await this.supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    if (variantsError) {
      throwQueryError(variantsError, "Falha ao buscar variantes do produto");
    }

    const variantIds = (variants ?? []).map((variant) => variant.id);

    if (variantIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("inventory_items")
      .select(inventorySelect())
      .in("product_variant_id", variantIds)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar estoque do produto");
    }

    return this.attachReservedOrderItems((data ?? []) as unknown as InventoryItemRow[]);
  }

  async getInventoryItemById(id: string) {
    const { data, error } = await this.supabase
      .from("inventory_items")
      .select(inventorySelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar item de estoque");
    }

    if (!data) {
      throw notFound("Item de estoque nao encontrado");
    }

    const [item] = await this.attachReservedOrderItems([data as unknown as InventoryItemRow]);
    return item;
  }

  async getInventoryItemWithMovements(inventoryItemId: string) {
    const [item, movements] = await Promise.all([
      this.getInventoryItemById(inventoryItemId),
      this.movements.listInventoryMovements({
        inventoryItemId,
        limit: 500,
      }),
    ]);

    return {
      ...item,
      inventory_movements: movements,
    };
  }

  async listInventoryMovements(filters: InventoryMovementFilters = {}) {
    return this.movements.listInventoryMovements(filters);
  }

  async createInventoryMovement(payload: CreateInventoryMovementInput) {
    return this.movements.createInventoryMovement({
      ...payload,
      createdBy: payload.createdBy ?? this.actorId ?? null,
    });
  }

  async getAvailableInventoryForVariant(productVariantId: string) {
    const { data, error } = await this.supabase
      .from("inventory_items")
      .select(inventorySelect())
      .eq("product_variant_id", productVariantId)
      .eq("status", "available")
      .order("created_at", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao buscar estoque disponivel");
    }

    return this.attachReservedOrderItems((data ?? []) as unknown as InventoryItemRow[]);
  }

  async addInventoryItem(input: AddInventoryItemInput) {
    if (input.status === "reserved") {
      throw badRequest("Crie a unidade como disponivel/indisponivel e use reserva vinculada a item de pedido");
    }

    const { data, error } = await this.supabase
      .from("inventory_items")
      .insert({
        landed_cost: input.landedCost ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        product_variant_id: input.productVariantId,
        purchase_cost: input.purchaseCost ?? null,
        sku: input.sku,
        status: input.status,
      })
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao adicionar item de estoque");
    }

    const created = data as unknown as InventoryItemRow;

    await this.movements.createInventoryMovement({
      createdBy: this.actorId ?? null,
      inventoryItemId: created.id,
      newLandedCost: created.landed_cost ?? null,
      newLocation: created.location ?? null,
      newPurchaseCost: created.purchase_cost ?? null,
      newStatus: created.status,
      notes: input.notes ?? null,
      productVariantId: created.product_variant_id,
      type: "created",
    });

    await this.audit.createAdminActionLog({
      action: "inventory.add",
      adminId: this.actorId,
      entityId: created.id,
      entityType: "inventory_item",
      newValue: created,
    });

    return created;
  }

  async reserveInventoryItem(id: string, orderItemId: string, notes?: string | null) {
    const current = await this.getInventoryItemById(id);

    if (current.status !== "available") {
      throw conflict("Item de estoque nao esta disponivel para reserva");
    }

    const orderItem = await this.getOrderItemForReservation(orderItemId, current);

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update({
        reserved_for_order_item_id: orderItemId,
        status: "reserved",
      })
      .eq("id", id)
      .eq("status", "available")
      .select(inventorySelect())
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao reservar item de estoque");
    }

    if (!data) {
      throw conflict("Item de estoque ja foi reservado");
    }

    if (orderItem.inventory_item_id !== id || orderItem.status !== "reserved") {
      const { error: orderItemError } = await this.supabase
        .from("order_items")
        .update({
          inventory_item_id: id,
          status: "reserved",
        })
        .eq("id", orderItemId);

      if (orderItemError) {
        throwQueryError(orderItemError, "Falha ao vincular item do pedido ao estoque");
      }
    }

    await this.movements.createInventoryMovement({
      createdBy: this.actorId ?? null,
      inventoryItemId: id,
      newStatus: "reserved",
      notes: notes ?? null,
      orderId: orderItem.order_id,
      orderItemId,
      previousStatus: current.status,
      productVariantId: current.product_variant_id,
      type: "reserved",
    });

    await this.audit.createAdminActionLog({
      action: "inventory.reserve",
      adminId: this.actorId,
      entityId: id,
      entityType: "inventory_item",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as InventoryItemRow;
  }

  async releaseInventoryItem(id: string, options: InventoryMutationOptions = {}) {
    const current = await this.getInventoryItemById(id);

    if (current.status !== "reserved") {
      throw conflict("Somente item reservado pode ser liberado");
    }

    const orderItemId = current.reserved_for_order_item_id ?? null;
    const orderId = orderItemId ? await this.getOrderIdByOrderItemId(orderItemId) : null;

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update({
        reserved_for_order_item_id: null,
        status: "available",
      })
      .eq("id", id)
      .eq("status", "reserved")
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao liberar item de estoque");
    }

    if (orderItemId) {
      await this.clearOrderItemInventoryLink(orderItemId, id);
    }

    await this.movements.createInventoryMovement({
      createdBy: this.actorId ?? null,
      inventoryItemId: id,
      newStatus: "available",
      notes: options.notes ?? null,
      orderId,
      orderItemId,
      previousStatus: current.status,
      productVariantId: current.product_variant_id,
      type: options.type ?? "released",
    });

    await this.audit.createAdminActionLog({
      action: options.type === "cancelled" ? "inventory.cancelled_release" : "inventory.release",
      adminId: this.actorId,
      entityId: id,
      entityType: "inventory_item",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as InventoryItemRow;
  }

  async markInventoryItemAsSold(id: string, notes?: string | null) {
    const current = await this.getInventoryItemById(id);

    if (current.status === "sold") {
      throw conflict("Item ja esta marcado como vendido");
    }

    const orderItemId = current.reserved_for_order_item_id ?? null;
    const orderId = orderItemId ? await this.getOrderIdByOrderItemId(orderItemId) : null;

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update({
        reserved_for_order_item_id: null,
        status: "sold",
      })
      .eq("id", id)
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao marcar estoque como vendido");
    }

    await this.movements.createInventoryMovement({
      createdBy: this.actorId ?? null,
      inventoryItemId: id,
      newStatus: "sold",
      notes: notes ?? null,
      orderId,
      orderItemId,
      previousStatus: current.status,
      productVariantId: current.product_variant_id,
      type: "sold",
    });

    await this.audit.createAdminActionLog({
      action: "inventory.mark_sold",
      adminId: this.actorId,
      entityId: id,
      entityType: "inventory_item",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as InventoryItemRow;
  }

  async markInventoryItemAsDamaged(id: string, notes?: string | null) {
    const current = await this.getInventoryItemById(id);

    if (current.status === "sold") {
      throw conflict("Item vendido nao pode ser alterado para avariado");
    }

    const orderItemId = current.reserved_for_order_item_id ?? null;
    const orderId = orderItemId ? await this.getOrderIdByOrderItemId(orderItemId) : null;

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update({
        reserved_for_order_item_id: null,
        status: "damaged",
      })
      .eq("id", id)
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao marcar estoque como avariado");
    }

    if (orderItemId) {
      await this.clearOrderItemInventoryLink(orderItemId, id);
    }

    await this.movements.createInventoryMovement({
      createdBy: this.actorId ?? null,
      inventoryItemId: id,
      newStatus: "damaged",
      notes: notes ?? null,
      orderId,
      orderItemId,
      previousStatus: current.status,
      productVariantId: current.product_variant_id,
      type: "damaged",
    });

    await this.audit.createAdminActionLog({
      action: "inventory.mark_damaged",
      adminId: this.actorId,
      entityId: id,
      entityType: "inventory_item",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as InventoryItemRow;
  }

  async markInventoryItemAsUnavailable(id: string, notes?: string | null) {
    const current = await this.getInventoryItemById(id);

    if (current.status === "sold") {
      throw conflict("Item vendido nao pode ser alterado para indisponivel");
    }

    const orderItemId = current.reserved_for_order_item_id ?? null;
    const orderId = orderItemId ? await this.getOrderIdByOrderItemId(orderItemId) : null;

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update({
        reserved_for_order_item_id: null,
        status: "unavailable",
      })
      .eq("id", id)
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao marcar estoque como indisponivel");
    }

    if (orderItemId) {
      await this.clearOrderItemInventoryLink(orderItemId, id);
    }

    await this.movements.createInventoryMovement({
      createdBy: this.actorId ?? null,
      inventoryItemId: id,
      newStatus: "unavailable",
      notes: notes ?? null,
      orderId,
      orderItemId,
      previousStatus: current.status,
      productVariantId: current.product_variant_id,
      type: "unavailable",
    });

    await this.audit.createAdminActionLog({
      action: "inventory.mark_unavailable",
      adminId: this.actorId,
      entityId: id,
      entityType: "inventory_item",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as InventoryItemRow;
  }

  async adjustInventoryItem(id: string, input: AdjustInventoryItemInput) {
    const current = await this.getInventoryItemById(id);

    if (input.status === "reserved" && current.status !== "reserved") {
      throw badRequest("Use a reserva vinculada a item de pedido para marcar estoque como reservado");
    }

    if (!hasMeaningfulChange(current, input)) {
      throw badRequest("Nenhuma alteracao informada para o item de estoque");
    }

    const orderItemId = shouldClearReservation(current, input.status)
      ? current.reserved_for_order_item_id ?? null
      : null;
    const orderId = orderItemId ? await this.getOrderIdByOrderItemId(orderItemId) : null;
    const patch = {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.purchaseCost !== undefined ? { purchase_cost: input.purchaseCost } : {}),
      ...(input.landedCost !== undefined ? { landed_cost: input.landedCost } : {}),
      ...(shouldClearReservation(current, input.status) ? { reserved_for_order_item_id: null } : {}),
    };

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update(patch)
      .eq("id", id)
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao ajustar item de estoque");
    }

    if (orderItemId && input.status !== "sold") {
      await this.clearOrderItemInventoryLink(orderItemId, id);
    }

    await this.movements.createInventoryMovement({
      createdBy: this.actorId ?? null,
      inventoryItemId: id,
      newLandedCost: input.landedCost !== undefined ? input.landedCost : current.landed_cost ?? null,
      newLocation: input.location !== undefined ? input.location : current.location ?? null,
      newPurchaseCost: input.purchaseCost !== undefined ? input.purchaseCost : current.purchase_cost ?? null,
      newStatus: input.status !== undefined ? input.status : current.status,
      notes: input.notes,
      orderId,
      orderItemId,
      previousLandedCost: current.landed_cost ?? null,
      previousLocation: current.location ?? null,
      previousPurchaseCost: current.purchase_cost ?? null,
      previousStatus: current.status,
      productVariantId: current.product_variant_id,
      type: getAdjustmentMovementType(current, input),
    });

    await this.audit.createAdminActionLog({
      action: "inventory.adjust",
      adminId: this.actorId,
      entityId: id,
      entityType: "inventory_item",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as InventoryItemRow;
  }

  private async attachReservedOrderItems(items: InventoryItemRow[]) {
    const orderItemIds = Array.from(
      new Set(
        items
          .map((item) => item.reserved_for_order_item_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (orderItemIds.length === 0) {
      return items.map((item) => ({ ...item, reserved_order_item: null }));
    }

    const { data, error } = await this.supabase
      .from("order_items")
      .select("id,order_id,status,orders(id,order_number,status)")
      .in("id", orderItemIds);

    if (error) {
      throwQueryError(error, "Falha ao buscar pedidos reservados no estoque");
    }

    const orderItems = new Map(
      ((data ?? []) as unknown as ReservedOrderItemRow[]).map((item) => [item.id, item]),
    );

    return items.map((item) => ({
      ...item,
      reserved_order_item: item.reserved_for_order_item_id
        ? orderItems.get(item.reserved_for_order_item_id) ?? null
        : null,
    }));
  }

  private async getOrderItemForReservation(orderItemId: string, inventoryItem: InventoryItemRow) {
    const { data, error } = await this.supabase
      .from("order_items")
      .select("id,order_id,product_variant_id,inventory_item_id,status")
      .eq("id", orderItemId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao validar item do pedido para reserva");
    }

    if (!data) {
      throw notFound("Item do pedido nao encontrado para reserva");
    }

    const orderItem = data as unknown as OrderItemForReservation;

    if (orderItem.status === "cancelled") {
      throw conflict("Item de pedido cancelado nao pode reservar estoque");
    }

    if (orderItem.product_variant_id !== inventoryItem.product_variant_id) {
      throw badRequest("Item de estoque nao pertence a variante do item do pedido");
    }

    if (orderItem.inventory_item_id && orderItem.inventory_item_id !== inventoryItem.id) {
      throw conflict("Item do pedido ja esta vinculado a outra unidade de estoque");
    }

    return orderItem;
  }

  private async getOrderIdByOrderItemId(orderItemId: string) {
    const { data, error } = await this.supabase
      .from("order_items")
      .select("order_id")
      .eq("id", orderItemId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido vinculado ao estoque");
    }

    return data?.order_id ?? null;
  }

  private async clearOrderItemInventoryLink(orderItemId: string, inventoryItemId: string) {
    const { error } = await this.supabase
      .from("order_items")
      .update({ inventory_item_id: null })
      .eq("id", orderItemId)
      .eq("inventory_item_id", inventoryItemId);

    if (error) {
      throwQueryError(error, "Falha ao limpar vinculo do item de pedido com estoque");
    }
  }
}
