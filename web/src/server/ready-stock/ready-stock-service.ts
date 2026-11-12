import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { badRequest, conflict } from "@/server/http/errors";
import { OrderV2Service } from "@/server/orders-v2/order-v2-service";
import {
  createInfinitePayCheckout,
  normalizeInfinitePayWebhook,
} from "@/server/payments/infinitepay-client";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

const optionalText = z.string().trim().optional().nullable();
const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().url().nullable().optional(),
);

export const readyStockStatusSchema = z.enum(["draft", "open", "paused", "archived"]);

export const createReadyStockItemSchema = z.object({
  categoryName: optionalText,
  code: optionalText,
  description: optionalText,
  franchiseName: optionalText,
  mainImageUrl: optionalUrl,
  maxPerCustomer: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().positive("Informe um preco maior que zero"),
  quantity: z.coerce.number().int().nonnegative("Quantidade deve ser zero ou maior"),
  status: readyStockStatusSchema.default("open"),
  title: z.string().trim().min(2, "Informe o nome do produto"),
});

export const createReadyStockCheckoutSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1, "Selecione ao menos um produto"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type CreateReadyStockItemInput = z.infer<typeof createReadyStockItemSchema>;
export type CreateReadyStockCheckoutInput = z.infer<typeof createReadyStockCheckoutSchema>;
export type ReadyStockStatus = z.infer<typeof readyStockStatusSchema>;

export type ReadyStockItem = {
  availableQuantity: number;
  categoryName: string | null;
  code: string;
  createdAt: string;
  description: string | null;
  franchiseName: string | null;
  id: string;
  mainImageUrl: string | null;
  maxPerCustomer: number | null;
  price: number;
  quantity: number;
  reservedQuantity: number;
  slug: string;
  status: ReadyStockStatus;
  title: string;
  updatedAt: string;
};

type ItemRow = {
  category_name: string | null;
  code: string;
  created_at: string;
  description: string | null;
  franchise_name: string | null;
  id: string;
  main_image_url: string | null;
  max_per_customer: number | null;
  price: number | string;
  quantity: number;
  reserved_quantity: number;
  slug: string;
  status: ReadyStockStatus;
  title: string;
  updated_at: string;
};

type OrderRow = {
  checkout_number: string;
  customer_id: string;
  expires_at: string;
  id: string;
  invoice_slug: string | null;
  payment_status: string;
  provider_reference: string | null;
  status: string;
  stock_released_at: string | null;
  total_amount: number | string;
  transaction_nsu: string | null;
  v2_order_id: string | null;
};

type OrderItemRow = {
  item_code: string;
  item_title: string;
  quantity: number;
  total_price: number | string;
  unit_price: number | string;
};

const itemSelect = "id,code,slug,title,description,main_image_url,status,price,quantity,reserved_quantity,category_name,franchise_name,max_per_customer,created_at,updated_at";

function mapItem(row: ItemRow): ReadyStockItem {
  return {
    availableQuantity: Math.max(0, row.quantity - row.reserved_quantity),
    categoryName: row.category_name,
    code: row.code,
    createdAt: row.created_at,
    description: row.description,
    franchiseName: row.franchise_name,
    id: row.id,
    mainImageUrl: row.main_image_url,
    maxPerCustomer: row.max_per_customer,
    price: Number(row.price),
    quantity: row.quantity,
    reservedQuantity: row.reserved_quantity,
    slug: row.slug,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function createNumber(prefix: string) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export class ReadyStockService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {}

  async listPublicItems(filters: { category?: string; franchise?: string; q?: string } = {}) {
    await this.expirePendingOrders();
    let query = this.supabase.from("ready_stock_items").select(itemSelect).eq("status", "open")
      .order("created_at", { ascending: false });

    if (filters.category?.trim()) query = query.eq("category_name", filters.category.trim());
    if (filters.franchise?.trim()) query = query.eq("franchise_name", filters.franchise.trim());
    if (filters.q?.trim()) {
      const search = filters.q.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.or(`title.ilike.%${search}%,code.ilike.%${search}%,franchise_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throwQueryError(error, "Falha ao listar pronta entrega");
    return ((data ?? []) as unknown as ItemRow[]).map(mapItem).filter((item) => item.availableQuantity > 0);
  }

  async listAdminItems(filters: { q?: string; status?: string } = {}) {
    await this.expirePendingOrders();
    let query = this.supabase.from("ready_stock_items").select(itemSelect).order("created_at", { ascending: false });
    if (filters.status && readyStockStatusSchema.safeParse(filters.status).success) query = query.eq("status", filters.status);
    if (filters.q?.trim()) {
      const search = filters.q.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.or(`title.ilike.%${search}%,code.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) throwQueryError(error, "Falha ao listar pronta entrega");
    return ((data ?? []) as unknown as ItemRow[]).map(mapItem);
  }

  async createItem(input: CreateReadyStockItemInput) {
    const base = slugify(input.code || input.title) || "produto";
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = input.code?.trim() || `PE-${base.toUpperCase().slice(0, 18)}-${suffix}`;
    const slug = `${slugify(input.title)}-${suffix.toLowerCase()}`;
    const { data, error } = await this.supabase.from("ready_stock_items").insert({
      category_name: input.categoryName ?? null,
      code,
      created_by: this.actorId ?? null,
      description: input.description ?? null,
      franchise_name: input.franchiseName ?? null,
      main_image_url: input.mainImageUrl ?? null,
      max_per_customer: input.maxPerCustomer ?? null,
      price: roundMoney(input.price),
      quantity: input.quantity,
      reserved_quantity: 0,
      slug,
      status: input.status,
      title: input.title,
      updated_by: this.actorId ?? null,
    }).select(itemSelect).single();
    if (error) throwQueryError(error, "Falha ao criar produto de pronta entrega");
    revalidatePath("/pronta-entrega");
    revalidatePath("/admin/estoque");
    return mapItem(data as unknown as ItemRow);
  }

  async createCheckout(customerId: string, input: CreateReadyStockCheckoutInput) {
    await this.expirePendingOrders();
    const quantities = new Map<string, number>();
    for (const entry of input.items) quantities.set(entry.itemId, (quantities.get(entry.itemId) ?? 0) + entry.quantity);
    const itemIds = [...quantities.keys()];
    const { data, error } = await this.supabase.from("ready_stock_items").select(itemSelect).in("id", itemIds);
    if (error) throwQueryError(error, "Falha ao validar estoque");
    const rows = (data ?? []) as unknown as ItemRow[];
    if (rows.length !== itemIds.length) throw badRequest("Um ou mais produtos nao foram encontrados");

    const total = roundMoney(rows.reduce((sum, row) => sum + Number(row.price) * (quantities.get(row.id) ?? 0), 0));
    const orderNumber = createNumber("PE");
    const checkoutNumber = createNumber("PEPAY");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: order, error: orderError } = await this.supabase.from("ready_stock_orders").insert({
      checkout_number: checkoutNumber,
      customer_id: customerId,
      expires_at: expiresAt,
      notes: input.notes ?? null,
      order_number: orderNumber,
      payment_status: "pending",
      status: "pending_payment",
      total_amount: total,
    }).select("id,order_number,checkout_number,total_amount,expires_at").single();
    if (orderError) throwQueryError(orderError, "Falha ao criar pedido de pronta entrega");

    const reservationItems = itemIds.map((itemId) => ({ itemId, quantity: quantities.get(itemId) ?? 0 }));
    const { error: reserveError } = await this.supabase.rpc("reserve_ready_stock_order", {
      p_items: reservationItems,
      p_order_id: order.id,
    });
    if (reserveError) {
      await this.supabase.from("ready_stock_orders").delete().eq("id", order.id);
      throw conflict(reserveError.message.includes("Estoque insuficiente") ? reserveError.message : "Estoque insuficiente ou produto indisponivel");
    }

    const { data: customer, error: customerError } = await this.supabase.from("customers")
      .select("name,email,phone,status").eq("id", customerId).maybeSingle();
    if (customerError || !customer || customer.status === "blocked") {
      await this.releaseOrder(order.id, "cancelled");
      throw conflict("Cliente indisponivel para compra");
    }

    try {
      const checkout = await createInfinitePayCheckout({
        amountCents: Math.round(total * 100),
        customerEmail: customer.email,
        customerName: customer.name,
        customerPhone: customer.phone,
        debugOrderId: order.id,
        items: rows.map((row) => ({
          name: row.title,
          quantity: quantities.get(row.id) ?? 0,
          unitAmountCents: Math.round(Number(row.price) * 100),
        })),
        kind: "preorder",
        orderNumber: checkoutNumber,
        redirectUrl: `${env.siteUrl}/conta/pedidos-v2?readyStock=${order.id}`,
        webhookUrl: `${env.siteUrl}/api/v1/webhooks/infinitepay`,
      });
      const { error: updateError } = await this.supabase.from("ready_stock_orders").update({
        invoice_slug: checkout.providerReference !== checkoutNumber ? checkout.providerReference : null,
        payment_link_url: checkout.checkoutUrl,
        payment_status: "checkout_generated",
        provider_reference: checkout.providerReference,
        request_payload: checkout.requestPayload,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      if (updateError) throwQueryError(updateError, "Falha ao salvar checkout");
      revalidatePath("/pronta-entrega");
      return { expiresAt, paymentLinkUrl: checkout.checkoutUrl, order };
    } catch (checkoutError) {
      await this.releaseOrder(order.id, "failed");
      throw checkoutError;
    }
  }

  async handleInfinitePayWebhook(payload: unknown) {
    const normalized = normalizeInfinitePayWebhook(payload);
    const references = [normalized.orderNumber, normalized.providerReference, normalized.invoiceSlug].filter(Boolean) as string[];
    let order: OrderRow | null = null;
    for (const reference of references) {
      const { data } = await this.supabase.from("ready_stock_orders")
        .select("id,checkout_number,customer_id,v2_order_id,status,payment_status,total_amount,expires_at,provider_reference,invoice_slug,transaction_nsu,stock_released_at")
        .or(`checkout_number.eq.${reference},provider_reference.eq.${reference},invoice_slug.eq.${reference}`).maybeSingle();
      if (data) { order = data as OrderRow; break; }
    }
    if (!order) return { status: "ignored", reason: "Pedido de pronta entrega nao encontrado" };
    if (order.payment_status === "paid") return { status: "ignored", reason: "Pagamento ja processado" };

    if (normalized.status !== "paid") {
      if (["failed", "expired", "cancelled"].includes(normalized.status)) await this.releaseOrder(order.id, normalized.status);
      return { status: "processed" };
    }
    if (order.stock_released_at) {
      await this.supabase.from("ready_stock_orders").update({ payment_status: "manual_review", status: "manual_review", provider_payload: payload }).eq("id", order.id);
      return { status: "manual_review", reason: "Pagamento recebido depois da liberacao do estoque" };
    }

    const paidAmount = normalized.paidAmountCents ?? normalized.amountCents;

    if (paidAmount === null || paidAmount + 1 < Math.round(Number(order.total_amount) * 100)) {
      await this.supabase.from("ready_stock_orders").update({
        payment_status: "manual_review",
        provider_payload: payload,
        status: "manual_review",
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      return { status: "manual_review", reason: "Valor pago menor que o total do pedido" };
    }

    const { data: orderItems, error: itemsError } = await this.supabase.from("ready_stock_order_items")
      .select("item_code,item_title,quantity,unit_price,total_price").eq("order_id", order.id);
    if (itemsError) throwQueryError(itemsError, "Falha ao carregar itens pagos");
    const items = (orderItems ?? []) as OrderItemRow[];
    const paidAt = new Date().toISOString();
    const v2Order = await new OrderV2Service(this.supabase, this.actorId).createPreorderOrderRequest({
      customerId: order.customer_id,
      items: items.map((item) => ({ productName: item.item_title, productSku: item.item_code, quantity: Number(item.quantity), unitPrice: Number(item.unit_price) })),
      notes: "Pedido de pronta entrega com pagamento imediato",
      paidAt,
    }, this.actorId);
    const v2 = v2Order as unknown as { id: string; order_number: string };
    const { error: finalizeError } = await this.supabase.rpc("finalize_ready_stock_order", { p_order_id: order.id });
    if (finalizeError) throwQueryError(finalizeError, "Falha ao baixar estoque");
    await this.supabase.from("ready_stock_orders").update({
      paid_at: paidAt,
      payment_status: "paid",
      provider_payload: payload,
      receipt_url: normalized.receiptUrl,
      status: "paid",
      transaction_nsu: normalized.transactionNsu,
      updated_at: paidAt,
      v2_order_id: v2.id,
    }).eq("id", order.id);
    revalidatePath("/pronta-entrega");
    return { orderId: v2.id, readyStockOrderId: order.id, status: "processed" };
  }

  private async releaseOrder(orderId: string, status: string) {
    const { data } = await this.supabase.from("ready_stock_orders").select("stock_released_at").eq("id", orderId).maybeSingle();
    if (!data?.stock_released_at) {
      const { error } = await this.supabase.rpc("release_ready_stock_order", { p_order_id: orderId });
      if (error) throwQueryError(error, "Falha ao liberar estoque");
    }
    await this.supabase.from("ready_stock_orders").update({ payment_status: status, status, updated_at: new Date().toISOString() }).eq("id", orderId);
  }

  private async expirePendingOrders() {
    const { data, error } = await this.supabase.from("ready_stock_orders").select("id")
      .lt("expires_at", new Date().toISOString()).is("stock_released_at", null)
      .in("payment_status", ["pending", "checkout_generated"]);
    if (error) throwQueryError(error, "Falha ao verificar reservas expiradas");
    await Promise.all((data ?? []).map((order) => this.releaseOrder(order.id, "expired")));
  }
}
