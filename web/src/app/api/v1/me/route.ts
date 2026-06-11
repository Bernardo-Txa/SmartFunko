import { z } from "zod";
import { badRequest, forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";
import { parseJsonBody } from "@/server/validation/parse-json";

const updateMeSchema = z.object({
  cpf: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  name: z.string().trim().min(2, "Informe seu nome"),
  phone: z.string().optional().nullable(),
}).strict();

function normalizeOptionalDigits(value: string | null | undefined) {
  const normalized = String(value ?? "").replace(/\D/g, "");
  return normalized || null;
}

function normalizeCpf(value: string | null | undefined) {
  const normalized = normalizeOptionalDigits(value);

  if (normalized && normalized.length !== 11) {
    throw badRequest("CPF deve ter 11 digitos");
  }

  return normalized;
}

function normalizePhone(value: string | null | undefined) {
  const normalized = normalizeOptionalDigits(value);

  if (normalized && normalized.length < 8) {
    throw badRequest("Telefone deve ter ao menos 8 digitos");
  }

  return normalized;
}

function normalizeInstagram(value: string | null | undefined) {
  const username = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^@+/, "");

  return username ? `@${username}` : null;
}

export async function GET() {
  return handleApi(async () => {
    const { authUser, customer, profile } = await requireUser();
    return jsonOk({
      customer,
      profile,
      user: {
        email: authUser.email,
        id: authUser.id,
      },
    });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const { authUser, customer, profile } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, updateMeSchema);
    const name = input.name.trim();
    const patch = {
      cpf: normalizeCpf(input.cpf),
      instagram: normalizeInstagram(input.instagram),
      name,
      phone: normalizePhone(input.phone),
    };
    const supabase = createSupabaseAdminClient();

    const { data: updatedCustomer, error: customerError } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", customer.id)
      .select("id,profile_id,name,email,phone,cpf,instagram,status")
      .single();

    if (customerError) {
      throwQueryError(customerError, "Falha ao atualizar seus dados");
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", profile.id)
      .select("id,auth_user_id,name,email,role")
      .single();

    if (profileError) {
      throwQueryError(profileError, "Falha ao atualizar seu perfil");
    }

    return jsonOk({
      customer: updatedCustomer,
      profile: updatedProfile,
      user: {
        email: authUser.email,
        id: authUser.id,
      },
    });
  });
}
