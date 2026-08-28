import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const createTemporaryCustomerSchema = z.object({
  name: z.string().trim().min(2),
  notes: z.string().trim().optional().nullable(),
  phone: z.string().trim().min(8),
});

export const mergeTemporaryCustomerSchema = z.object({
  customerId: z.string().uuid(),
});

export type CreateTemporaryCustomerInput = z.infer<typeof createTemporaryCustomerSchema>;
export type MergeTemporaryCustomerInput = z.infer<typeof mergeTemporaryCustomerSchema>;

type TemporaryCustomerRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  notes: string | null;
  status: string;
  merged_customer_id: string | null;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
};

type MergeCustomerRow = {
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: string;
};

type TemporaryOrderRow = {
  fulfillment_status: string;
  id: string;
  order_number: string;
  payment_status: string;
  temporary_customer_id: string | null;
  total: number | string | null;
};

export type TemporaryCustomerMergeCandidate = {
  createdAt: string;
  id: string;
  name: string;
  notes: string | null;
  orders: {
    paid: number;
    pending: number;
    totalAmount: number;
    totalCount: number;
  };
  phone: string;
  phoneNormalized: string;
  suggestedCustomerId: string | null;
  updatedAt: string;
};

export function normalizeTemporaryCustomerPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export class TemporaryCustomerService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listTemporaryCustomers() {
    const { data, error } = await this.supabase
      .from("temporary_customers")
      .select("id,name,phone,phone_normalized,notes,status,merged_customer_id,merged_at,created_at,updated_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar clientes temporarios");
    }

    return data ?? [];
  }

  async listMergeCandidates(): Promise<TemporaryCustomerMergeCandidate[]> {
    const temporaryCustomers = await this.listTemporaryCustomers() as TemporaryCustomerRow[];
    const temporaryCustomerIds = temporaryCustomers.map((customer) => customer.id);
    const ordersByTemporaryCustomer = new Map<string, TemporaryOrderRow[]>();
    const customerByPhone = await this.getRegisteredCustomersByPhone();

    if (temporaryCustomerIds.length > 0) {
      const { data, error } = await this.supabase
        .from("v2_orders")
        .select("id,order_number,temporary_customer_id,total,payment_status,fulfillment_status")
        .in("temporary_customer_id", temporaryCustomerIds);

      if (error) {
        throwQueryError(error, "Falha ao listar pedidos de clientes temporarios");
      }

      for (const order of (data ?? []) as TemporaryOrderRow[]) {
        if (!order.temporary_customer_id) {
          continue;
        }

        const orders = ordersByTemporaryCustomer.get(order.temporary_customer_id) ?? [];
        orders.push(order);
        ordersByTemporaryCustomer.set(order.temporary_customer_id, orders);
      }
    }

    return temporaryCustomers.map((customer) => {
      const orders = ordersByTemporaryCustomer.get(customer.id) ?? [];
      const phoneKey = customer.phone_normalized || normalizeTemporaryCustomerPhone(customer.phone);
      const suggestedCustomer = phoneKey ? customerByPhone.get(phoneKey) : undefined;

      return {
        createdAt: customer.created_at,
        id: customer.id,
        name: customer.name,
        notes: customer.notes,
        orders: {
          paid: orders.filter((order) => order.payment_status === "pago").length,
          pending: orders.filter((order) => order.payment_status !== "pago").length,
          totalAmount: orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
          totalCount: orders.length,
        },
        phone: customer.phone,
        phoneNormalized: phoneKey,
        suggestedCustomerId: suggestedCustomer?.id ?? null,
        updatedAt: customer.updated_at,
      };
    });
  }

  async getActiveTemporaryCustomer(id: string) {
    const { data, error } = await this.supabase
      .from("temporary_customers")
      .select("id,name,phone,phone_normalized,notes,status,merged_customer_id,merged_at,created_at,updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao validar cliente temporario");
    }

    if (!data) {
      throw notFound("Cliente temporario nao encontrado");
    }

    if (data.status !== "active") {
      throw conflict("Cliente temporario nao esta ativo");
    }

    return data;
  }

  async createTemporaryCustomer(input: CreateTemporaryCustomerInput) {
    const phoneNormalized = normalizeTemporaryCustomerPhone(input.phone);

    if (phoneNormalized.length < 8) {
      throw badRequest("Informe um WhatsApp valido para o cliente temporario");
    }

    const { data: existing, error: existingError } = await this.supabase
      .from("temporary_customers")
      .select("id,name,phone,phone_normalized,notes,status,merged_customer_id,merged_at,created_at,updated_at")
      .eq("phone_normalized", phoneNormalized)
      .eq("status", "active")
      .maybeSingle();

    if (existingError) {
      throwQueryError(existingError, "Falha ao validar cliente temporario existente");
    }

    if (existing) {
      return existing;
    }

    const { data, error } = await this.supabase
      .from("temporary_customers")
      .insert({
        created_by: this.actorId ?? null,
        name: input.name,
        notes: input.notes ?? null,
        phone: input.phone,
        phone_normalized: phoneNormalized,
      })
      .select("id,name,phone,phone_normalized,notes,status,merged_customer_id,merged_at,created_at,updated_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar cliente temporario");
    }

    return data;
  }

  async mergeTemporaryCustomer(temporaryCustomerId: string, input: MergeTemporaryCustomerInput) {
    const temporaryCustomer = await this.getActiveTemporaryCustomer(temporaryCustomerId) as TemporaryCustomerRow;
    const targetCustomer = await this.getMergeTargetCustomer(input.customerId);
    const { data: orders, error: ordersError } = await this.supabase
      .from("v2_orders")
      .select("id,order_number,temporary_customer_id,total,payment_status,fulfillment_status")
      .eq("temporary_customer_id", temporaryCustomer.id);

    if (ordersError) {
      throwQueryError(ordersError, "Falha ao buscar pedidos do cliente temporario");
    }

    const linkedOrders = (orders ?? []) as TemporaryOrderRow[];
    const now = new Date().toISOString();

    if (linkedOrders.length > 0) {
      const { error: updateOrdersError } = await this.supabase
        .from("v2_orders")
        .update({
          customer_id: targetCustomer.id,
          temporary_customer_id: null,
          updated_at: now,
        })
        .eq("temporary_customer_id", temporaryCustomer.id);

      if (updateOrdersError) {
        throwQueryError(updateOrdersError, "Falha ao vincular pedidos ao cliente cadastrado");
      }
    }

    const { data: mergedTemporaryCustomer, error: updateTemporaryError } = await this.supabase
      .from("temporary_customers")
      .update({
        merged_at: now,
        merged_customer_id: targetCustomer.id,
        status: "merged",
        updated_at: now,
      })
      .eq("id", temporaryCustomer.id)
      .eq("status", "active")
      .select("id,name,phone,phone_normalized,notes,status,merged_customer_id,merged_at,created_at,updated_at")
      .single();

    if (updateTemporaryError) {
      throwQueryError(updateTemporaryError, "Falha ao marcar cliente temporario como unificado");
    }

    if (linkedOrders.length > 0) {
      const { error: eventError } = await this.supabase.from("v2_order_events").insert(
        linkedOrders.map((order) => ({
          actor_id: this.actorId ?? null,
          customer_id: targetCustomer.id,
          event_type: "customer.merged",
          metadata: {
            targetCustomerId: targetCustomer.id,
            targetCustomerName: targetCustomer.name,
            temporaryCustomerId: temporaryCustomer.id,
            temporaryCustomerName: temporaryCustomer.name,
            temporaryCustomerPhone: temporaryCustomer.phone,
          },
          notes: "Cliente temporario unificado ao cadastro principal",
          order_id: order.id,
        })),
      );

      if (eventError) {
        throwQueryError(eventError, "Falha ao registrar unificacao nos pedidos V2");
      }
    }

    await this.audit.createAdminActionLog({
      action: "temporary_customer.merge",
      adminId: this.actorId,
      entityId: temporaryCustomer.id,
      entityType: "temporary_customer",
      newValue: {
        mergedTemporaryCustomer,
        ordersUpdated: linkedOrders.length,
        targetCustomer,
      },
      oldValue: temporaryCustomer,
    });

    return {
      customer: targetCustomer,
      ordersUpdated: linkedOrders.length,
      temporaryCustomer: mergedTemporaryCustomer,
    };
  }

  private async getMergeTargetCustomer(customerId: string): Promise<MergeCustomerRow> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id,name,email,phone,status")
      .eq("id", customerId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar cliente cadastrado");
    }

    if (!data) {
      throw notFound("Cliente cadastrado nao encontrado");
    }

    if (data.status === "blocked") {
      throw conflict("Nao e possivel unificar com cliente bloqueado");
    }

    return data as MergeCustomerRow;
  }

  private async getRegisteredCustomersByPhone() {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id,name,email,phone,status")
      .not("phone", "is", null)
      .neq("status", "blocked");

    if (error) {
      throwQueryError(error, "Falha ao buscar clientes cadastrados por telefone");
    }

    const customerByPhone = new Map<string, MergeCustomerRow>();

    for (const customer of (data ?? []) as MergeCustomerRow[]) {
      const phoneKey = normalizeTemporaryCustomerPhone(customer.phone ?? "");

      if (phoneKey && !customerByPhone.has(phoneKey)) {
        customerByPhone.set(phoneKey, customer);
      }
    }

    return customerByPhone;
  }
}
