import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const createTemporaryCustomerSchema = z.object({
  name: z.string().trim().min(2),
  notes: z.string().trim().optional().nullable(),
  phone: z.string().trim().min(8),
});

export type CreateTemporaryCustomerInput = z.infer<typeof createTemporaryCustomerSchema>;

export function normalizeTemporaryCustomerPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export class TemporaryCustomerService {
  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {}

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
}
