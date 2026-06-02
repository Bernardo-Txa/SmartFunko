import "server-only";
import type { User } from "@supabase/supabase-js";
import { forbidden, internalError, unauthorized } from "@/server/http/errors";
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/server/supabase/server-client";

export type ProfileRole = "customer" | "admin" | "owner";

export type AuthProfile = {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: ProfileRole;
};

export type AuthCustomer = {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "vip" | "blocked";
};

export type AuthContext = {
  supabase: SupabaseServerClient;
  authUser: User;
  profile: AuthProfile;
  customer: AuthCustomer | null;
};

export async function requireUser(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw unauthorized();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,auth_user_id,name,email,role")
    .eq("auth_user_id", user.id)
    .maybeSingle<AuthProfile>();

  if (profileError) {
    throw internalError("Falha ao carregar perfil autenticado");
  }

  if (!profile) {
    throw forbidden("Perfil nao encontrado");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id,profile_id,name,email,phone,status")
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
    authUser: user,
    profile,
    customer,
  };
}
