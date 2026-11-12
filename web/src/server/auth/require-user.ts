import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/server/auth/get-authenticated-user";
import { forbidden, internalError } from "@/server/http/errors";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

export type ProfileRole = "customer" | "admin" | "owner";

export type AuthProfile = {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: ProfileRole;
};

export type AuthCustomer = {
  address_complement: string | null;
  address_number: string | null;
  city: string | null;
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  instagram: string | null;
  neighborhood: string | null;
  postal_code: string | null;
  state: string | null;
  status: "active" | "vip" | "blocked";
  street: string | null;
};

export type AuthContext = {
  supabase: SupabaseClient;
  authUser: User;
  profile: AuthProfile;
  customer: AuthCustomer | null;
};

export async function requireUser(request?: Request): Promise<AuthContext> {
  const { authUser, supabase } = await getAuthenticatedUser(request);
  const dataClient = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await dataClient
    .from("profiles")
    .select("id,auth_user_id,name,email,role")
    .eq("auth_user_id", authUser.id)
    .maybeSingle<AuthProfile>();

  if (profileError) {
    throw internalError("Falha ao carregar perfil autenticado");
  }

  if (!profile) {
    throw forbidden("Perfil nao encontrado");
  }

  const { data: customer, error: customerError } = await dataClient
    .from("customers")
    .select("id,profile_id,name,email,phone,cpf,instagram,postal_code,street,address_number,address_complement,neighborhood,city,state,status")
    .eq("profile_id", profile.id)
    .maybeSingle<AuthCustomer>();

  if (customerError) {
    throw internalError("Falha ao carregar cliente autenticado");
  }

  if (customer?.status === "blocked") {
    throw forbidden("Cadastro bloqueado");
  }

  return {
    supabase,
    authUser,
    profile,
    customer,
  };
}
