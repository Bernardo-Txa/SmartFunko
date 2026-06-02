import "server-only";
import { z } from "zod";
import { conflict, notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
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

export const addInventoryItemSchema = z.object({
  productVariantId: z.string().uuid(),
  sku: z.string().trim().min(2),
  status: inventoryStatusSchema.default("available"),
  location: z.string().trim().optional().nullable(),
  purchaseCost: z.number().nonnegative().optional().nullable(),
  landedCost: z.number().nonnegative().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type AddInventoryItemInput = z.infer<typeof addInventoryItemSchema>;

export type InventoryItemRow = {
  id: string;
  product_variant_id: string;
  sku: string;
  status: string;
  reserved_for_order_item_id?: string | null;
};

function inventorySelect() {
  return `
    id,product_variant_id,sku,status,location,purchase_cost,landed_cost,reserved_for_order_item_id,notes,created_at,updated_at,
    product_variants(id,sku,product_id,products(id,name,slug))
  `;
}

export class InventoryService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listInventory() {
    const { data, error } = await this.supabase
      .from("inventory_items")
      .select(inventorySelect())
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar estoque");
    }

    return data ?? [];
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

    return data as unknown as InventoryItemRow;
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

    return data ?? [];
  }

  async addInventoryItem(input: AddInventoryItemInput) {
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

    await this.audit.createAdminActionLog({
      action: "inventory.add",
      adminId: this.actorId,
      entityId: created.id,
      entityType: "inventory_item",
      newValue: created,
    });

    return created;
  }

  async reserveInventoryItem(id: string, orderItemId: string) {
    const current = await this.getInventoryItemById(id);

    if (current.status !== "available") {
      throw conflict("Item de estoque nao esta disponivel para reserva");
    }

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

  async releaseInventoryItem(id: string) {
    const current = await this.getInventoryItemById(id);

    if (current.status !== "reserved") {
      throw conflict("Somente item reservado pode ser liberado");
    }

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

    await this.audit.createAdminActionLog({
      action: "inventory.release",
      adminId: this.actorId,
      entityId: id,
      entityType: "inventory_item",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as InventoryItemRow;
  }

  async markInventoryItemAsSold(id: string) {
    const current = await this.getInventoryItemById(id);

    if (current.status === "sold") {
      throw conflict("Item ja esta marcado como vendido");
    }

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update({ status: "sold" })
      .eq("id", id)
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao marcar estoque como vendido");
    }

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

  async markInventoryItemAsDamaged(id: string) {
    const current = await this.getInventoryItemById(id);

    if (current.status === "sold") {
      throw conflict("Item vendido nao pode ser alterado para avariado");
    }

    const { data, error } = await this.supabase
      .from("inventory_items")
      .update({ status: "damaged" })
      .eq("id", id)
      .select(inventorySelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao marcar estoque como avariado");
    }

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
}
