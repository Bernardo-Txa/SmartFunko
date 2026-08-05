import "server-only";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve seguir YYYY-MM-DD");
const optionalText = z.string().trim().optional().nullable();
const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().url().nullable().optional(),
);

function optionalGalleryUrls() {
  return z.preprocess(
    (value) => {
      const rawValues = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(/[\n,|]/)
          : [];

      return rawValues.map((entry) => String(entry).trim()).filter(Boolean);
    },
    z.array(z.string().url()).default([]),
  );
}

export const preorderItemStatusSchema = z.enum(["draft", "open", "paused", "closed", "archived"]);

export const createPreorderItemSchema = z.object({
  categoryName: optionalText,
  code: optionalText,
  description: optionalText,
  expectedArrival: optionalText,
  franchiseName: optionalText,
  galleryImageUrls: optionalGalleryUrls(),
  mainImageUrl: optionalUrl,
  maxPerCustomer: z.coerce.number().int().positive().optional().nullable(),
  orderDeadline: isoDateSchema.optional().nullable(),
  price: z.coerce.number().positive("Informe um preco maior que zero"),
  shortDescription: optionalText,
  slug: optionalText,
  status: preorderItemStatusSchema.default("draft"),
  title: z.string().trim().min(2, "Informe o nome da pre-venda"),
});

export const updatePreorderItemSchema = createPreorderItemSchema.partial();

export const createPreorderReservationSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1, "Selecione ao menos uma pre-venda"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type CreatePreorderItemInput = z.infer<typeof createPreorderItemSchema>;
export type UpdatePreorderItemInput = z.infer<typeof updatePreorderItemSchema>;
export type CreatePreorderReservationInput = z.infer<typeof createPreorderReservationSchema>;

export type PreorderItemStatus = z.infer<typeof preorderItemStatusSchema>;

export type PreorderItem = {
  categoryName: string | null;
  code: string;
  createdAt: string;
  description: string | null;
  expectedArrival: string | null;
  franchiseName: string | null;
  galleryImageUrls: string[];
  id: string;
  mainImageUrl: string | null;
  maxPerCustomer: number | null;
  orderDeadline: string | null;
  price: number;
  shortDescription: string | null;
  slug: string;
  stats: {
    approvedAmount: number;
    approvedQuantity: number;
    pendingAmount: number;
    pendingQuantity: number;
    reservationItems: number;
    requestedQuantity: number;
  };
  status: PreorderItemStatus;
  title: string;
  updatedAt: string;
};

type PreorderItemRow = {
  category_name: string | null;
  code: string;
  created_at: string;
  description: string | null;
  expected_arrival: string | null;
  franchise_name: string | null;
  id: string;
  main_image_url: string | null;
  max_per_customer: number | null;
  order_deadline: string | null;
  price: number | string;
  preorder_item_images?: Array<{
    image_url: string;
    sort_order: number | null;
  }> | null;
  short_description: string | null;
  slug: string;
  status: PreorderItemStatus;
  title: string;
  updated_at: string;
};

type ReservationItemStatsRow = {
  preorder_item_id: string;
  quantity: number | string;
  total_price: number | string;
  preorder_reservations?: {
    status?: string | null;
    v2_orders?: {
      approval_status?: string | null;
      payment_status?: string | null;
    } | Array<{
      approval_status?: string | null;
      payment_status?: string | null;
    }> | null;
  } | Array<{
    status?: string | null;
    v2_orders?: {
      approval_status?: string | null;
      payment_status?: string | null;
    } | Array<{
      approval_status?: string | null;
      payment_status?: string | null;
    }> | null;
  }> | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function createNumber(prefix: "PV" | "PVRES") {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${date}-${time}-${suffix}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function itemSelect() {
  return `
    id,code,slug,title,short_description,description,main_image_url,status,price,
    category_name,franchise_name,expected_arrival,order_deadline,max_per_customer,created_at,updated_at,
    preorder_item_images(image_url,sort_order)
  `;
}

function mapItem(row: PreorderItemRow, stats = emptyStats()): PreorderItem {
  const galleryImageUrls = (row.preorder_item_images ?? [])
    .slice()
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
    .map((image) => image.image_url);

  return {
    categoryName: row.category_name,
    code: row.code,
    createdAt: row.created_at,
    description: row.description,
    expectedArrival: row.expected_arrival,
    franchiseName: row.franchise_name,
    galleryImageUrls,
    id: row.id,
    mainImageUrl: row.main_image_url,
    maxPerCustomer: row.max_per_customer,
    orderDeadline: row.order_deadline,
    price: Number(row.price),
    shortDescription: row.short_description,
    slug: row.slug,
    stats,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function emptyStats() {
  return {
    approvedAmount: 0,
    approvedQuantity: 0,
    pendingAmount: 0,
    pendingQuantity: 0,
    reservationItems: 0,
    requestedQuantity: 0,
  };
}

function isPubliclyOpen(item: PreorderItemRow) {
  if (item.status !== "open") {
    return false;
  }

  return !item.order_deadline || item.order_deadline >= todayInSaoPaulo();
}

export class PreorderService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listAdminPreorderItems(filters: { q?: string; status?: string } = {}) {
    let query = this.supabase
      .from("preorder_items")
      .select(itemSelect())
      .order("created_at", { ascending: false });

    if (filters.q?.trim()) {
      const search = filters.q.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.or(`title.ilike.%${search}%,code.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (filters.status && preorderItemStatusSchema.safeParse(filters.status).success) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar pre-vendas");
    }

    const rows = (data ?? []) as unknown as PreorderItemRow[];
    const stats = await this.getStatsByItemId(rows.map((item) => item.id));

    return rows.map((row) => mapItem(row, stats.get(row.id) ?? emptyStats()));
  }

  async listPublicPreorderItems() {
    const { data, error } = await this.supabase
      .from("preorder_items")
      .select(itemSelect())
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar pre-vendas publicas");
    }

    return ((data ?? []) as unknown as PreorderItemRow[])
      .filter(isPubliclyOpen)
      .map((row) => mapItem(row));
  }

  async createPreorderItem(input: CreatePreorderItemInput) {
    const [code, slug] = await Promise.all([
      this.createUniqueCode(input.code ?? null, input.title),
      this.createUniqueSlug(input.slug ?? null, input.title),
    ]);

    const { data, error } = await this.supabase
      .from("preorder_items")
      .insert({
        category_name: input.categoryName ?? null,
        code,
        created_by: this.actorId ?? null,
        description: input.description ?? null,
        expected_arrival: input.expectedArrival ?? null,
        franchise_name: input.franchiseName ?? null,
        main_image_url: input.mainImageUrl ?? null,
        max_per_customer: input.maxPerCustomer ?? null,
        order_deadline: input.orderDeadline ?? null,
        price: roundMoney(input.price),
        short_description: input.shortDescription ?? null,
        slug,
        status: input.status,
        title: input.title,
        updated_by: this.actorId ?? null,
      })
      .select(itemSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar pre-venda");
    }

    const created = data as unknown as PreorderItemRow;
    await this.replaceImages(created.id, input.galleryImageUrls ?? []);
    await this.audit.createAdminActionLog({
      action: "preorder_item.create",
      adminId: this.actorId,
      entityId: created.id,
      entityType: "preorder_item",
      newValue: data,
    });
    revalidateTag("preorders", "max");

    return this.getAdminPreorderItemById(created.id);
  }

  async updatePreorderItem(itemId: string, input: UpdatePreorderItemInput) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: this.actorId ?? null,
    };

    if (input.categoryName !== undefined) patch.category_name = input.categoryName ?? null;
    if (input.description !== undefined) patch.description = input.description ?? null;
    if (input.expectedArrival !== undefined) patch.expected_arrival = input.expectedArrival ?? null;
    if (input.franchiseName !== undefined) patch.franchise_name = input.franchiseName ?? null;
    if (input.mainImageUrl !== undefined) patch.main_image_url = input.mainImageUrl ?? null;
    if (input.maxPerCustomer !== undefined) patch.max_per_customer = input.maxPerCustomer ?? null;
    if (input.orderDeadline !== undefined) patch.order_deadline = input.orderDeadline ?? null;
    if (input.price !== undefined) patch.price = roundMoney(input.price);
    if (input.shortDescription !== undefined) patch.short_description = input.shortDescription ?? null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.title !== undefined) patch.title = input.title;

    if (input.slug !== undefined) {
      patch.slug = await this.createUniqueSlug(input.slug, input.title ?? "pre-venda", itemId);
    }

    if (input.code !== undefined) {
      patch.code = await this.createUniqueCode(input.code, input.title ?? "pre-venda", itemId);
    }

    const { data, error } = await this.supabase
      .from("preorder_items")
      .update(patch)
      .eq("id", itemId)
      .select(itemSelect())
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao atualizar pre-venda");
    }

    if (!data) {
      throw notFound("Pre-venda nao encontrada");
    }

    if (input.galleryImageUrls !== undefined) {
      await this.replaceImages(itemId, input.galleryImageUrls);
    }

    await this.audit.createAdminActionLog({
      action: "preorder_item.update",
      adminId: this.actorId,
      entityId: itemId,
      entityType: "preorder_item",
      newValue: patch,
    });
    revalidateTag("preorders", "max");

    return this.getAdminPreorderItemById(itemId);
  }

  async deletePreorderItem(itemId: string) {
    const stats = (await this.getStatsByItemId([itemId])).get(itemId);

    if (stats && stats.requestedQuantity > 0) {
      throw conflict("Pre-venda com pedidos criados deve ser arquivada, nao excluida");
    }

    const { error } = await this.supabase.from("preorder_items").delete().eq("id", itemId);

    if (error) {
      throwQueryError(error, "Falha ao excluir pre-venda");
    }

    await this.audit.createAdminActionLog({
      action: "preorder_item.delete",
      adminId: this.actorId,
      entityId: itemId,
      entityType: "preorder_item",
    });
    revalidateTag("preorders", "max");
  }

  async createCustomerReservation(
    customerId: string,
    input: CreatePreorderReservationInput,
    actorProfileId?: string,
  ) {
    const quantities = new Map<string, number>();

    for (const item of input.items) {
      quantities.set(item.itemId, (quantities.get(item.itemId) ?? 0) + item.quantity);
    }

    const itemIds = Array.from(quantities.keys());
    const { data, error } = await this.supabase
      .from("preorder_items")
      .select(itemSelect())
      .in("id", itemIds);

    if (error) {
      throwQueryError(error, "Falha ao validar pre-vendas");
    }

    const items = (data ?? []) as unknown as PreorderItemRow[];
    const itemById = new Map(items.map((item) => [item.id, item]));

    if (itemById.size !== itemIds.length) {
      throw badRequest("Uma ou mais pre-vendas nao foram encontradas");
    }

    const orderItems = itemIds.map((itemId) => {
      const item = itemById.get(itemId);
      const quantity = quantities.get(itemId) ?? 0;

      if (!item) {
        throw badRequest("Pre-venda nao encontrada");
      }

      if (!isPubliclyOpen(item)) {
        throw conflict(`Pre-venda indisponivel: ${item.title}`);
      }

      if (item.max_per_customer && quantity > item.max_per_customer) {
        throw conflict(`${item.title} permite no maximo ${item.max_per_customer} unidade(s) por pedido`);
      }

      return {
        productName: item.title,
        productSku: item.code,
        quantity,
        unitPrice: Number(item.price),
      };
    });

    const order = await new OrderV2Service(this.supabase, actorProfileId ?? this.actorId)
      .createPreorderOrderRequest({
        customerId,
        items: orderItems,
        notes: input.notes ?? null,
      }, actorProfileId);
    const orderRow = order as unknown as {
      id: string;
      order_number: string;
      total: number | string;
    };

    const { data: reservation, error: reservationError } = await this.supabase
      .from("preorder_reservations")
      .insert({
        customer_id: customerId,
        notes: input.notes ?? null,
        reservation_number: createNumber("PVRES"),
        status: "awaiting_approval",
        total_amount: Number(orderRow.total),
        v2_order_id: orderRow.id,
      })
      .select("id,reservation_number")
      .single();

    if (reservationError) {
      await this.supabase.from("v2_orders").delete().eq("id", orderRow.id);
      throwQueryError(reservationError, "Falha ao registrar reserva de pre-venda");
    }

    const { error: reservationItemsError } = await this.supabase
      .from("preorder_reservation_items")
      .insert(orderItems.map((orderItem) => {
        const item = items.find((entry) => entry.code === orderItem.productSku);

        return {
          item_code: orderItem.productSku,
          item_title: orderItem.productName,
          preorder_item_id: item?.id ?? null,
          quantity: orderItem.quantity,
          reservation_id: reservation.id,
          total_price: roundMoney(orderItem.quantity * orderItem.unitPrice),
          unit_price: orderItem.unitPrice,
        };
      }));

    if (reservationItemsError) {
      await this.supabase.from("preorder_reservations").delete().eq("id", reservation.id);
      await this.supabase.from("v2_orders").delete().eq("id", orderRow.id);
      throwQueryError(reservationItemsError, "Falha ao registrar itens da pre-venda");
    }

    await this.audit.createAdminActionLog({
      action: "preorder_reservation.create",
      adminId: actorProfileId ?? this.actorId,
      entityId: reservation.id,
      entityType: "preorder_reservation",
      newValue: {
        orderId: orderRow.id,
        reservationNumber: reservation.reservation_number,
      },
    });
    revalidateTag("preorders", "max");

    return {
      order,
      reservation,
    };
  }

  async getAdminPreorderItemById(itemId: string) {
    const { data, error } = await this.supabase
      .from("preorder_items")
      .select(itemSelect())
      .eq("id", itemId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pre-venda");
    }

    if (!data) {
      throw notFound("Pre-venda nao encontrada");
    }

    const stats = (await this.getStatsByItemId([itemId])).get(itemId) ?? emptyStats();
    return mapItem(data as unknown as PreorderItemRow, stats);
  }

  private async getStatsByItemId(itemIds: string[]) {
    const stats = new Map<string, ReturnType<typeof emptyStats>>();

    for (const itemId of itemIds) {
      stats.set(itemId, emptyStats());
    }

    if (itemIds.length === 0) {
      return stats;
    }

    const { data, error } = await this.supabase
      .from("preorder_reservation_items")
      .select(`
        preorder_item_id,quantity,total_price,
        preorder_reservations(status,v2_orders(approval_status,payment_status))
      `)
      .in("preorder_item_id", itemIds);

    if (error) {
      throwQueryError(error, "Falha ao calcular reservas de pre-venda");
    }

    for (const row of (data ?? []) as unknown as ReservationItemStatsRow[]) {
      const current = stats.get(row.preorder_item_id) ?? emptyStats();
      const quantity = Number(row.quantity);
      const amount = Number(row.total_price);
      const reservation = firstRelation(row.preorder_reservations);
      const order = firstRelation(reservation?.v2_orders);
      const approvalStatus = order?.approval_status ?? reservation?.status ?? "";

      current.reservationItems += 1;
      current.requestedQuantity += quantity;

      if (approvalStatus === "aprovado" || reservation?.status === "approved") {
        current.approvedQuantity += quantity;
        current.approvedAmount += amount;
      } else if (!["recusado", "cancelled", "rejected"].includes(approvalStatus)) {
        current.pendingQuantity += quantity;
        current.pendingAmount += amount;
      }

      stats.set(row.preorder_item_id, current);
    }

    return stats;
  }

  private async createUniqueSlug(inputSlug: string | null | undefined, title: string, ignoreId?: string) {
    const baseSlug = slugify(inputSlug || title) || `pre-venda-${Date.now().toString(36)}`;

    for (let index = 0; index < 20; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
      let query = this.supabase.from("preorder_items").select("id").eq("slug", candidate).limit(1);

      if (ignoreId) {
        query = query.neq("id", ignoreId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throwQueryError(error, "Falha ao validar slug da pre-venda");
      }

      if (!data) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  private async createUniqueCode(inputCode: string | null | undefined, title: string, ignoreId?: string) {
    const manualCode = inputCode?.trim().toUpperCase();
    const titleCode = slugify(title)
      .split("-")
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part.slice(0, 5))
      .join("-")
      .toUpperCase();
    const baseCode = manualCode || `PV-${titleCode || "ITEM"}`;

    for (let index = 0; index < 20; index += 1) {
      const candidate = index === 0 ? baseCode : `${baseCode}-${index + 1}`;
      let query = this.supabase.from("preorder_items").select("id").eq("code", candidate).limit(1);

      if (ignoreId) {
        query = query.neq("id", ignoreId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throwQueryError(error, "Falha ao validar codigo da pre-venda");
      }

      if (!data) {
        return candidate;
      }
    }

    return `${baseCode}-${Date.now().toString(36).toUpperCase()}`;
  }

  private async replaceImages(itemId: string, imageUrls: string[]) {
    const uniqueUrls = Array.from(new Set(imageUrls.map((url) => url.trim()).filter(Boolean)));
    const { error: deleteError } = await this.supabase
      .from("preorder_item_images")
      .delete()
      .eq("preorder_item_id", itemId);

    if (deleteError) {
      throwQueryError(deleteError, "Falha ao limpar imagens da pre-venda");
    }

    if (uniqueUrls.length === 0) {
      return;
    }

    const { error } = await this.supabase.from("preorder_item_images").insert(
      uniqueUrls.map((imageUrl, index) => ({
        image_url: imageUrl,
        preorder_item_id: itemId,
        sort_order: index + 1,
      })),
    );

    if (error) {
      throwQueryError(error, "Falha ao salvar imagens da pre-venda");
    }
  }
}
