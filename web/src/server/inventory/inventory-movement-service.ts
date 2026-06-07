import "server-only";
import { z } from "zod";
import { notFound } from "@/server/http/errors";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const inventoryMovementTypeSchema = z.enum([
  "created",
  "status_change",
  "reserved",
  "released",
  "sold",
  "cancelled",
  "received",
  "damaged",
  "unavailable",
  "manual_adjustment",
  "cost_adjustment",
  "location_change",
]);

export type InventoryMovementType = z.infer<typeof inventoryMovementTypeSchema>;

export type InventoryMovementFilters = {
  inventoryItemId?: string;
  limit?: number;
  orderId?: string;
  productVariantId?: string;
};

export type CreateInventoryMovementInput = {
  inventoryItemId: string;
  productVariantId?: string | null;
  orderId?: string | null;
  orderItemId?: string | null;
  type: InventoryMovementType;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousLocation?: string | null;
  newLocation?: string | null;
  previousPurchaseCost?: number | string | null;
  newPurchaseCost?: number | string | null;
  previousLandedCost?: number | string | null;
  newLandedCost?: number | string | null;
  notes?: string | null;
  createdBy?: string | null;
};

function inventoryMovementSelect() {
  return `
    id,inventory_item_id,product_variant_id,order_id,order_item_id,type,
    previous_status,new_status,previous_location,new_location,
    previous_purchase_cost,new_purchase_cost,previous_landed_cost,new_landed_cost,
    notes,created_by,created_at,
    profiles(name,email),
    orders(id,order_number,status),
    order_items(id,status)
  `;
}

function inventoryItemSelect() {
  return `
    id,product_variant_id,sku,status,location,purchase_cost,landed_cost,reserved_for_order_item_id,notes,created_at,updated_at,
    product_variants(id,sku,product_id,products(id,name,slug))
  `;
}

function nullableNumber(value: number | string | null | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

export class InventoryMovementService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async listInventoryMovements(filters: InventoryMovementFilters = {}) {
    const limit = Math.min(500, Math.max(1, Number(filters.limit ?? 200)));
    let query = this.supabase
      .from("inventory_movements")
      .select(inventoryMovementSelect())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.inventoryItemId) {
      query = query.eq("inventory_item_id", filters.inventoryItemId);
    }

    if (filters.productVariantId) {
      query = query.eq("product_variant_id", filters.productVariantId);
    }

    if (filters.orderId) {
      query = query.eq("order_id", filters.orderId);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar movimentos de estoque");
    }

    return data ?? [];
  }

  async getInventoryItemWithMovements(inventoryItemId: string) {
    const { data, error } = await this.supabase
      .from("inventory_items")
      .select(inventoryItemSelect())
      .eq("id", inventoryItemId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar item com historico de estoque");
    }

    if (!data) {
      throw notFound("Item de estoque nao encontrado");
    }

    const movements = await this.listInventoryMovements({
      inventoryItemId,
      limit: 500,
    });

    return {
      ...(data as unknown as Record<string, unknown>),
      inventory_movements: movements,
    };
  }

  async createInventoryMovement(input: CreateInventoryMovementInput) {
    const { data, error } = await this.supabase
      .from("inventory_movements")
      .insert({
        created_by: input.createdBy ?? null,
        inventory_item_id: input.inventoryItemId,
        new_landed_cost: nullableNumber(input.newLandedCost),
        new_location: input.newLocation ?? null,
        new_purchase_cost: nullableNumber(input.newPurchaseCost),
        new_status: input.newStatus ?? null,
        notes: input.notes ?? null,
        order_id: input.orderId ?? null,
        order_item_id: input.orderItemId ?? null,
        previous_landed_cost: nullableNumber(input.previousLandedCost),
        previous_location: input.previousLocation ?? null,
        previous_purchase_cost: nullableNumber(input.previousPurchaseCost),
        previous_status: input.previousStatus ?? null,
        product_variant_id: input.productVariantId ?? null,
        type: input.type,
      })
      .select(inventoryMovementSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao registrar movimento de estoque");
    }

    return data;
  }
}
