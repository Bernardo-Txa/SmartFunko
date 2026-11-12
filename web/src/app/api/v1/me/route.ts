import { z } from "zod";
import { formatPhoneNumber, getPhoneDigits, isValidPhoneNumber } from "@/lib/format";
import { badRequest, forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";
import { parseJsonBody } from "@/server/validation/parse-json";

const updateMeSchema = z.object({
  address_complement: z.string().trim().max(120).optional().nullable(),
  address_number: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  cpf: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  name: z.string().trim().min(2, "Informe seu nome"),
  neighborhood: z.string().trim().max(100).optional().nullable(),
  phone: z.string().optional().nullable(),
  postal_code: z.string().trim().optional().nullable(),
  state: z.string().trim().max(2).optional().nullable(),
  street: z.string().trim().max(160).optional().nullable(),
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
  const normalized = getPhoneDigits(value);

  if (normalized && !isValidPhoneNumber(value)) {
    throw badRequest("Telefone deve estar no formato (00) 00000-0000");
  }

  return normalized ? formatPhoneNumber(normalized) : null;
}

function normalizeInstagram(value: string | null | undefined) {
  const username = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^@+/, "");

  return username ? `@${username}` : null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizePostalCode(value: string | null | undefined) {
  const digits = normalizeOptionalDigits(value);

  if (digits && digits.length !== 8) {
    throw badRequest("CEP deve ter 8 digitos");
  }

  return digits ? `${digits.slice(0, 5)}-${digits.slice(5)}` : null;
}

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { authUser, customer, profile } = await requireUser(request);
    return jsonOk({
      customer,
      profile,
      user: {
        email: authUser.email,
        id: authUser.id,
      },
    });
  }));
}

export async function PATCH(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { authUser, customer, profile } = await requireUser(request);

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const input = await parseJsonBody(request, updateMeSchema);
    const name = input.name.trim();
    const patch = {
      address_complement: normalizeOptionalText(input.address_complement),
      address_number: normalizeOptionalText(input.address_number),
      city: normalizeOptionalText(input.city),
      cpf: normalizeCpf(input.cpf),
      instagram: normalizeInstagram(input.instagram),
      name,
      neighborhood: normalizeOptionalText(input.neighborhood),
      phone: normalizePhone(input.phone),
      postal_code: normalizePostalCode(input.postal_code),
      state: normalizeOptionalText(input.state)?.toUpperCase() ?? null,
      street: normalizeOptionalText(input.street),
    };
    const supabase = createSupabaseAdminClient();

    const { data: updatedCustomer, error: customerError } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", customer.id)
      .select("id,profile_id,name,email,phone,cpf,instagram,postal_code,street,address_number,address_complement,neighborhood,city,state,status")
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
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
