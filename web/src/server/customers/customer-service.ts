import "server-only";
import { z } from "zod";
import { conflict, notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().min(8).optional().nullable(),
  cpf: z.string().trim().optional().nullable(),
  instagram: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  status: z.enum(["active", "vip", "blocked"]).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export class CustomerService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listCustomers() {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id,profile_id,name,email,phone,cpf,instagram,status,notes,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar clientes");
    }

    return data ?? [];
  }

  async getCustomerById(id: string) {
    const { data, error } = await this.supabase
      .from("customers")
      .select("id,profile_id,name,email,phone,cpf,instagram,status,notes,created_at,updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar cliente");
    }

    if (!data) {
      throw notFound("Cliente nao encontrado");
    }

    return data;
  }

  async createCustomer(input: CreateCustomerInput) {
    const normalizedEmail = input.email?.toLowerCase() ?? null;

    if (normalizedEmail) {
      const { data: existing, error: existingError } = await this.supabase
        .from("customers")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingError) {
        throwQueryError(existingError, "Falha ao validar cliente existente");
      }

      if (existing) {
        throw conflict("Ja existe cliente com este e-mail");
      }
    }

    const { data, error } = await this.supabase
      .from("customers")
      .insert({
        cpf: input.cpf ?? null,
        email: normalizedEmail,
        instagram: input.instagram ?? null,
        name: input.name,
        notes: input.notes ?? null,
        phone: input.phone ?? null,
      })
      .select("id,profile_id,name,email,phone,cpf,instagram,status,notes,created_at,updated_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar cliente");
    }

    await this.audit.createAdminActionLog({
      action: "customer.create",
      adminId: this.actorId,
      entityId: data.id,
      entityType: "customer",
      newValue: data,
    });

    return data;
  }

  async updateCustomer(id: string, input: UpdateCustomerInput) {
    const current = await this.getCustomerById(id);
    const patch = {
      ...input,
      email: input.email === undefined ? undefined : input.email?.toLowerCase() ?? null,
    };

    const { data, error } = await this.supabase
      .from("customers")
      .update(patch)
      .eq("id", id)
      .select("id,profile_id,name,email,phone,cpf,instagram,status,notes,created_at,updated_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar cliente");
    }

    await this.audit.createAdminActionLog({
      action: "customer.update",
      adminId: this.actorId,
      entityId: id,
      entityType: "customer",
      newValue: data,
      oldValue: current,
    });

    return data;
  }

  async blockCustomer(id: string) {
    return this.updateCustomer(id, { status: "blocked" });
  }

  async markVip(id: string) {
    return this.updateCustomer(id, { status: "vip" });
  }
}
