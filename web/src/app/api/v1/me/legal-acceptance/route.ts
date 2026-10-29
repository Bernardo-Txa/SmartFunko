import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@/lib/legal";
import { getAuthenticatedUser } from "@/server/auth/get-authenticated-user";
import { corsPreflightResponse, withCors } from "@/server/http/cors";
import { handleApi, jsonCreated, jsonOk } from "@/server/http/responses";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

type LegalAcceptanceRow = {
  accepted_at: string;
  privacy_version: string;
  terms_version: string;
};

async function findCurrentAcceptance(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("accepted_at,privacy_version,terms_version")
    .eq("auth_user_id", authUserId)
    .eq("terms_version", CURRENT_TERMS_VERSION)
    .eq("privacy_version", CURRENT_PRIVACY_VERSION)
    .maybeSingle<LegalAcceptanceRow>();

  if (error) {
    throwQueryError(error, "Falha ao consultar o aceite dos documentos legais");
  }

  return data;
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwardedFor || request.headers.get("x-real-ip") || null)?.slice(0, 128) ?? null;
}

export async function GET(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { authUser } = await getAuthenticatedUser(request);
    const acceptance = await findCurrentAcceptance(authUser.id);

    return jsonOk({
      accepted: Boolean(acceptance),
      acceptedAt: acceptance?.accepted_at ?? null,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      termsVersion: CURRENT_TERMS_VERSION,
    });
  }));
}

export async function POST(request: Request) {
  return withCors(request, await handleApi(async () => {
    const { authUser } = await getAuthenticatedUser(request);
    const existingAcceptance = await findCurrentAcceptance(authUser.id);

    if (existingAcceptance) {
      return jsonOk({
        accepted: true,
        acceptedAt: existingAcceptance.accepted_at,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        termsVersion: CURRENT_TERMS_VERSION,
      });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("legal_acceptances")
      .insert({
        acceptance_source: "web",
        auth_user_id: authUser.id,
        ip_address: getRequestIp(request),
        privacy_version: CURRENT_PRIVACY_VERSION,
        terms_version: CURRENT_TERMS_VERSION,
        user_agent: request.headers.get("user-agent")?.slice(0, 1000) ?? null,
      })
      .select("accepted_at,privacy_version,terms_version")
      .single<LegalAcceptanceRow>();

    if (error) {
      // Uma requisição simultânea pode ter criado o mesmo aceite.
      if (error.code === "23505") {
        const acceptance = await findCurrentAcceptance(authUser.id);
        return jsonOk({
          accepted: true,
          acceptedAt: acceptance?.accepted_at ?? null,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          termsVersion: CURRENT_TERMS_VERSION,
        });
      }

      throwQueryError(error, "Falha ao registrar o aceite dos documentos legais");
    }

    return jsonCreated({
      accepted: true,
      acceptedAt: data.accepted_at,
      privacyVersion: data.privacy_version,
      termsVersion: data.terms_version,
    });
  }));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

