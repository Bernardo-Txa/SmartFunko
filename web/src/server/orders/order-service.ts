import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { getOrderItemSourceLabel, getOrderSellerLabel } from "@/lib/order-labels";
import { getOrderPendingAmount, getOrderPaidAmount, isOrderPayable } from "@/lib/orders/payable";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { InventoryService } from "@/server/inventory/inventory-service";
import { calculateOrderTotals } from "@/server/orders/order-calculator";
import { RewardsService } from "@/server/rewards/rewards-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const orderStatusSchema = z.enum([
  "draft",
  "pending_payment",
  "partially_paid",
  "paid",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const orderReviewStatusSchema = z.enum([
  "under_review",
  "approved_for_payment",
  "awaiting_payment",
  "rejected",
  "paid",
  "cancelled",
]);

export const orderItemStatusSchema = z.enum([
  "requested",
  "reserved",
  "waiting_payment",
  "paid",
  "waiting_purchase",
  "purchased",
  "in_transit",
  "received",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
]);

export const createOrderItemSchema = z.object({
  productVariantId: z.string().uuid(),
  inventoryItemId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  source: z.enum(["stock", "national_order", "international_order", "preorder", "auction"]).default("stock"),
  status: orderItemStatusSchema.optional(),
});

export const orderSellerSchema = z.enum(["daniel", "allana"]);

export const createManualOrderSchema = z.object({
  customerId: z.string().uuid(),
  channel: z.enum(["whatsapp", "website", "admin", "preorder"]).default("whatsapp"),
  discount: z.number().nonnegative().default(0),
  shippingAmount: z.number().nonnegative().default(0),
  seller: orderSellerSchema.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  internalNotes: z.string().trim().optional().nullable(),
  items: z.array(createOrderItemSchema).default([]),
});

export const updateOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  discount: z.number().nonnegative().optional(),
  shippingAmount: z.number().nonnegative().optional(),
  seller: orderSellerSchema.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  internalNotes: z.string().trim().optional().nullable(),
});

export const updateOrderItemStatusSchema = z.object({
  status: orderItemStatusSchema,
  notes: z.string().trim().optional().nullable(),
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export type OrderListFilters = {
  channel?: string;
  limit?: number;
  reviewStatus?: string;
  search?: string;
  seller?: string;
  status?: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  seller: string | null;
  status: string;
  subtotal: number;
  discount: number;
  shipping_amount: number;
  total: number;
  public_token: string;
  public_tracking_enabled: boolean;
  review_status: string;
};

type OrderDetailRow = OrderRow & {
  order_items?: Array<{
    id?: string;
    inventory_item_id: string | null;
  }>;
  payments?: Array<{
    id?: string;
  }>;
};

type PublicOrderPayment = {
  amount: number;
  created_at: string;
  method: string;
  paid_at: string | null;
  status: string;
};

type PublicOrderItem = {
  product_variants?: {
    sku?: string;
    products?: {
      name?: string;
    } | null;
  } | null;
  quantity: number;
  source: string;
  status: string;
  total_price: number;
  unit_price: number;
};

type PublicOrderRow = {
  coupon_code: string | null;
  created_at: string;
  customers?: {
    name?: string;
  } | null;
  discount: number;
  seller: string | null;
  notes: string | null;
  order_items?: PublicOrderItem[];
  order_number: string;
  payments?: PublicOrderPayment[];
  payment_link_url: string | null;
  public_token: string;
  public_tracking_enabled: boolean;
  rejected_reason: string | null;
  review_notes: string | null;
  review_status: string;
  status: string;
  total: number;
  updated_at: string;
};

function orderSelect() {
  return `
    id,order_number,customer_id,channel,seller,status,subtotal,discount,shipping_amount,total,coupon_id,coupon_code,
    public_token,public_token_created_at,public_tracking_enabled,notes,internal_notes,created_by,created_at,updated_at,
    review_status,review_notes,rejected_reason,reviewed_by,reviewed_at,
    payment_provider,payment_link_url,payment_provider_reference,payment_link_created_at,payment_link_expires_at,
    payment_max_installments,payment_max_installments_source,payment_fee_mode,
    paid_installments,provider_payment_method,provider_fee_amount,
    customers(id,name,email,phone,status),
    order_items(
      id,order_id,product_variant_id,inventory_item_id,quantity,unit_price,total_price,source,status,created_at,updated_at,
      product_variants(id,sku,products(id,name,slug,main_image_url))
    ),
    payments(id,method,amount,fee_amount,net_amount,status,paid_at,created_at)
  `;
}

function createOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SF-${date}-${time}-${suffix}`;
}

function escapeIlike(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_").trim();
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export class OrderService {
  private readonly audit: AuditLogService;
  private readonly inventory: InventoryService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
    this.inventory = new InventoryService(this.supabase, actorId);
  }

  async listOrders(filters: OrderListFilters = {}) {
    const limit = Math.min(200, Math.max(1, Number(filters.limit ?? 100)));
    const search = filters.search?.trim();
    let customerIds: string[] = [];

    if (search) {
      const safeSearch = escapeIlike(search);
      const { data: customers, error: customerError } = await this.supabase
        .from("customers")
        .select("id")
        .ilike("name", `%${safeSearch}%`)
        .limit(100);

      if (customerError) {
        throwQueryError(customerError, "Falha ao buscar clientes para filtro de pedidos");
      }

      customerIds = (customers ?? []).map((customer) => customer.id);
    }

    let query = this.supabase
      .from("orders")
      .select(orderSelect())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.channel) {
      query = query.eq("channel", filters.channel);
    }

    if (filters.seller) {
      query = query.eq("seller", filters.seller);
    }

    if (filters.reviewStatus) {
      query = query.eq("review_status", filters.reviewStatus);
    }

    if (search) {
      const safeSearch = escapeIlike(search);
      const clauses = [`order_number.ilike.%${safeSearch}%`];

      if (customerIds.length > 0) {
        clauses.push(`customer_id.in.(${customerIds.join(",")})`);
      }

      query = query.or(clauses.join(","));
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar pedidos");
    }

    return data ?? [];
  }

  async getOrderById(id: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(orderSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido");
    }

    if (!data) {
      throw notFound("Pedido nao encontrado");
    }

    return data as unknown as OrderDetailRow;
  }

  async createManualOrder(input: CreateManualOrderInput) {
    const { data: customer, error: customerError } = await this.supabase
      .from("customers")
      .select("id,status")
      .eq("id", input.customerId)
      .maybeSingle();

    if (customerError) {
      throwQueryError(customerError, "Falha ao validar cliente do pedido");
    }

    if (!customer) {
      throw notFound("Cliente nao encontrado");
    }

    if (customer.status === "blocked") {
      throw conflict("Cliente bloqueado nao pode receber novo pedido");
    }

    const { data: order, error } = await this.supabase
      .from("orders")
      .insert({
        channel: input.channel,
        created_by: this.actorId ?? null,
        customer_id: input.customerId,
        discount: input.discount,
        internal_notes: input.internalNotes ?? null,
        notes: input.notes ?? null,
        order_number: createOrderNumber(),
        review_status: "approved_for_payment",
        seller: input.seller ?? null,
        shipping_amount: input.shippingAmount,
        status: "draft",
      })
      .select("id,order_number,customer_id,seller,status,subtotal,discount,shipping_amount,total,public_token,public_tracking_enabled,review_status")
      .single<OrderRow>();

    if (error) {
      throwQueryError(error, "Falha ao criar pedido");
    }

    await this.audit.createAdminActionLog({
      action: "order.create",
      adminId: this.actorId,
      entityId: order.id,
      entityType: "order",
      newValue: order,
    });

    await this.addOrderHistory(
      order.id,
      null,
      "draft",
      `Pedido criado${order.seller ? ` por ${getOrderSellerLabel(order.seller)}` : ""}`,
    );

    for (const item of input.items) {
      await this.addOrderItem(order.id, item);
    }

    await this.recalculateOrder(order.id);
    const fullOrder = await this.getOrderById(order.id);

    if (input.items.length > 0) {
      await this.updateOrderStatus(order.id, "pending_payment", "Pedido manual com itens");
    }

    return input.items.length > 0 ? this.getOrderById(order.id) : fullOrder;
  }

  async addOrderItem(orderId: string, input: CreateOrderItemInput) {
    const order = await this.getOrderById(orderId);

    if (order.status === "cancelled") {
      throw conflict("Pedido cancelado nao aceita novos itens");
    }

    if (input.source === "stock" && input.inventoryItemId) {
      const inventoryItem = await this.inventory.getInventoryItemById(input.inventoryItemId);

      if (inventoryItem.status !== "available") {
        throw conflict("Item de estoque nao esta disponivel");
      }

      if (inventoryItem.product_variant_id !== input.productVariantId) {
        throw badRequest("Item de estoque nao pertence a variante informada");
      }
    }

    const status =
      input.status ?? (input.source === "stock" && input.inventoryItemId ? "reserved" : "requested");

    const { data: item, error } = await this.supabase
      .from("order_items")
      .insert({
        inventory_item_id: input.inventoryItemId ?? null,
        order_id: orderId,
        product_variant_id: input.productVariantId,
        quantity: input.quantity,
        source: input.source,
        status,
        total_price: input.quantity * input.unitPrice,
        unit_price: input.unitPrice,
      })
      .select("id,order_id,product_variant_id,inventory_item_id,quantity,unit_price,total_price,source,status,created_at,updated_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao adicionar item ao pedido");
    }

    try {
      if (input.source === "stock" && input.inventoryItemId) {
        await this.inventory.reserveInventoryItem(input.inventoryItemId, item.id);
      }
    } catch (errorToRollback) {
      await this.supabase.from("order_items").delete().eq("id", item.id);
      throw errorToRollback;
    }

    await this.recalculateOrder(orderId);
    await this.audit.createAdminActionLog({
      action: "order_item.add",
      adminId: this.actorId,
      entityId: item.id,
      entityType: "order_item",
      newValue: item,
    });
    await this.addOrderHistory(
      orderId,
      null,
      status,
      `Item adicionado ao pedido. Origem: ${getOrderItemSourceLabel(input.source)}`,
      item.id,
    );

    return item;
  }

  async updateOrderStatus(orderId: string, status: z.infer<typeof orderStatusSchema>, notes?: string) {
    const current = await this.getOrderById(orderId);
    const previousStatus = current.status;

    const { data, error } = await this.supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select(orderSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar status do pedido");
    }

    await this.addOrderHistory(orderId, previousStatus, status, notes);
    await this.audit.createAdminActionLog({
      action: "order.status_update",
      adminId: this.actorId,
      entityId: orderId,
      entityType: "order",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as OrderDetailRow;
  }

  async updateOrder(id: string, input: UpdateOrderInput) {
    const current = await this.getOrderById(id);
    const patch = withoutUndefined({
      discount: input.discount,
      internal_notes: input.internalNotes,
      notes: input.notes,
      seller: input.seller,
      shipping_amount: input.shippingAmount,
      status: input.status,
    });
    const { data, error } = await this.supabase
      .from("orders")
      .update(patch)
      .eq("id", id)
      .select(orderSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar pedido");
    }

    if (input.status && input.status !== current.status) {
      await this.addOrderHistory(id, current.status, input.status);
    }

    if (input.seller !== undefined && input.seller !== current.seller) {
      await this.addOrderHistory(
        id,
        current.status,
        current.status,
        `Vendedor atualizado para ${getOrderSellerLabel(input.seller)}`,
      );
    }

    await this.recalculateOrder(id);
    await this.audit.createAdminActionLog({
      action: "order.update",
      adminId: this.actorId,
      entityId: id,
      entityType: "order",
      newValue: data,
      oldValue: current,
    });

    return this.getOrderById(id);
  }

  async updateOrderItemStatus(
    orderItemId: string,
    status: z.infer<typeof orderItemStatusSchema>,
    notes?: string | null,
  ) {
    const { data: current, error: currentError } = await this.supabase
      .from("order_items")
      .select("id,order_id,status")
      .eq("id", orderItemId)
      .maybeSingle();

    if (currentError) {
      throwQueryError(currentError, "Falha ao buscar item do pedido");
    }

    if (!current) {
      throw notFound("Item do pedido nao encontrado");
    }

    const { data, error } = await this.supabase
      .from("order_items")
      .update({ status })
      .eq("id", orderItemId)
      .select("id,order_id,product_variant_id,inventory_item_id,quantity,unit_price,total_price,source,status,created_at,updated_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar item do pedido");
    }

    await this.addOrderHistory(current.order_id, current.status, status, notes ?? undefined, orderItemId);
    await this.audit.createAdminActionLog({
      action: "order_item.status_update",
      adminId: this.actorId,
      entityId: orderItemId,
      entityType: "order_item",
      newValue: data,
      oldValue: current,
    });

    return data;
  }

  async cancelOrder(id: string, notes?: string) {
    const order = await this.getOrderById(id);

    if (order.status === "cancelled") {
      return order;
    }

    for (const item of order.order_items ?? []) {
      if (item.inventory_item_id) {
        const inventoryItem = await this.inventory.getInventoryItemById(item.inventory_item_id);
        if (inventoryItem.status === "reserved") {
          await this.inventory.releaseInventoryItem(item.inventory_item_id, {
            notes: notes ?? "Pedido cancelado",
            type: "cancelled",
          });
        }
      }
    }

    const cancelledOrder = await this.updateOrderStatus(id, "cancelled", notes ?? "Pedido cancelado");
    await this.safeReverseOrderPaymentPoints(id);
    return cancelledOrder;
  }

  async getPublicOrderByNumberAndToken(orderNumber: string, token: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(orderSelect())
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido publico");
    }

    const publicOrder = data as unknown as PublicOrderRow | null;

    if (!publicOrder || !publicOrder.public_tracking_enabled || publicOrder.public_token !== token) {
      throw notFound("Pedido nao encontrado");
    }

    return this.sanitizePublicOrder(publicOrder);
  }

  async getCustomerOrders(customerId: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(orderSelect())
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar pedidos do cliente");
    }

    return data ?? [];
  }

  async getCustomerOrderByNumber(customerId: string, orderNumber: string) {
    const { data, error } = await this.supabase
      .from("orders")
      .select(orderSelect())
      .eq("customer_id", customerId)
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar pedido do cliente");
    }

    if (!data) {
      throw notFound("Pedido nao encontrado");
    }

    return data;
  }

  async getCustomerOrdersForApi(customerId: string) {
    const orders = await this.getCustomerOrders(customerId);

    return (orders as unknown as PublicOrderRow[]).map((order) => this.sanitizePublicOrder(order));
  }

  async getCustomerOrderByNumberForApi(customerId: string, orderNumber: string) {
    const order = await this.getCustomerOrderByNumber(customerId, orderNumber);

    return this.sanitizePublicOrder(order as unknown as PublicOrderRow);
  }

  async listOrderStatusHistory(orderId: string) {
    const { data, error } = await this.supabase
      .from("order_status_history")
      .select("id,order_id,order_item_id,previous_status,new_status,notes,changed_by,created_at,profiles(name,email)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar historico do pedido");
    }

    return data ?? [];
  }

  async listOrderAuditLogs(orderId: string) {
    const order = await this.getOrderById(orderId);
    const entityIds = [
      order.id,
      ...(order.order_items ?? []).map((item) => item.id).filter(Boolean),
      ...(order.payments ?? []).map((payment) => payment.id).filter(Boolean),
    ];

    const { data, error } = await this.supabase
      .from("admin_action_logs")
      .select("id,admin_id,action,entity_type,entity_id,old_value,new_value,created_at,profiles(name,email)")
      .in("entity_id", entityIds)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar logs do pedido");
    }

    return data ?? [];
  }

  private async recalculateOrder(orderId: string) {
    const { data: order, error: orderError } = await this.supabase
      .from("orders")
      .select("id,discount,shipping_amount")
      .eq("id", orderId)
      .single();

    if (orderError) {
      throwQueryError(orderError, "Falha ao recalcular pedido");
    }

    const { data: items, error: itemsError } = await this.supabase
      .from("order_items")
      .select("quantity,unit_price")
      .eq("order_id", orderId)
      .neq("status", "cancelled");

    if (itemsError) {
      throwQueryError(itemsError, "Falha ao recalcular itens do pedido");
    }

    const totals = calculateOrderTotals({
      discount: Number(order.discount ?? 0),
      items: (items ?? []).map((item) => ({
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
      })),
      shippingAmount: Number(order.shipping_amount ?? 0),
    });

    const { error } = await this.supabase
      .from("orders")
      .update({
        subtotal: totals.subtotal,
        total: totals.total,
      })
      .eq("id", orderId);

    if (error) {
      throwQueryError(error, "Falha ao atualizar totais do pedido");
    }

    return totals;
  }

  private async addOrderHistory(
    orderId: string,
    previousStatus: string | null,
    newStatus: string,
    notes?: string,
    orderItemId?: string,
  ) {
    const { error } = await this.supabase.from("order_status_history").insert({
      changed_by: this.actorId ?? null,
      new_status: newStatus,
      notes: notes ?? null,
      order_id: orderId,
      order_item_id: orderItemId ?? null,
      previous_status: previousStatus,
    });

    if (error) {
      throwQueryError(error, "Falha ao registrar historico de status");
    }
  }

  private async safeReverseOrderPaymentPoints(orderId: string) {
    try {
      await new RewardsService(this.supabase, this.actorId).reverseOrderPaymentPoints(orderId, "order_cancelled");
    } catch (error) {
      console.error("Falha ao reverter pontos do pedido cancelado", error);
    }
  }

  private sanitizePublicOrder(order: PublicOrderRow) {
    const payable = isOrderPayable(order);
    const paidAmount = getOrderPaidAmount(order);
    const pendingAmount = getOrderPendingAmount(order);

    return {
      createdAt: order.created_at,
      customerName: order.customers?.name ?? "Cliente",
      items: (order.order_items ?? []).map((item) => ({
        name: item.product_variants?.products?.name ?? "Produto",
        quantity: item.quantity,
        sku: item.product_variants?.sku ?? "-",
        source: item.source,
        status: item.status,
        totalPrice: item.total_price,
        unitPrice: item.unit_price,
      })),
      notes: order.notes,
      orderNumber: order.order_number,
      paidAmount,
      pendingAmount,
      paymentLinkUrl: payable ? order.payment_link_url : null,
      payments: (order.payments ?? []).map((payment) => ({
        amount: payment.amount,
        createdAt: payment.created_at,
        method: payment.method,
        paidAt: payment.paid_at,
        status: payment.status,
      })),
      rejectedReason: order.rejected_reason,
      reviewNotes: order.review_notes,
      reviewStatus: order.review_status,
      seller: order.seller,
      status: order.status,
      couponCode: order.coupon_code,
      discount: Number(order.discount ?? 0),
      total: order.total,
      updatedAt: order.updated_at,
    };
  }
}
