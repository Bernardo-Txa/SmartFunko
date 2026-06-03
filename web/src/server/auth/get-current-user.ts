import "server-only";
import type { User } from "@supabase/supabase-js";
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/server/supabase/server-client";
import type { AuthCustomer, AuthProfile } from "@/server/auth/require-user";

export type CurrentUserContext = {
  supabase: SupabaseServerClient;
  authUser: User;
  profile: AuthProfile;
  customer: AuthCustomer | null;
};

export async function getCurrentUser(): Promise<CurrentUserContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,auth_user_id,name,email,role")
    .eq("auth_user_id", user.id)
    .maybeSingle<AuthProfile>();

  if (profileError || !profile) {
    console.error("Failed to load current profile", profileError);
    return null;
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id,profile_id,name,email,phone,cpf,instagram,status")
    .eq("profile_id", profile.id)
    .maybeSingle<AuthCustomer>();

  if (customerError) {
    console.error("Failed to load current customer", customerError);
    return null;
  }

  return {
    supabase,
    authUser: user,
    profile,
    customer,
  };
}
