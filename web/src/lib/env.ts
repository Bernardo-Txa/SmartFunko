function normalizeSiteUrl(value: string | undefined) {
  const fallback = "http://localhost:3000";
  const raw = process.env.NODE_ENV === "development" ? fallback : value || fallback;

  try {
    const url = new URL(raw);
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export const env = {
  enableAssistedCheckout: process.env.NEXT_PUBLIC_ENABLE_ASSISTED_CHECKOUT ?? "true",
  enablePopFlix: process.env.NEXT_PUBLIC_POPFLIX_ENABLED ?? process.env.POPFLIX_ENABLED ?? "",
  enableRaffles: process.env.NEXT_PUBLIC_ENABLE_RAFFLES ?? "",
  enableRewards: process.env.NEXT_PUBLIC_ENABLE_REWARDS ?? "",
  infinitePayApiBaseUrl: process.env.INFINITEPAY_API_BASE_URL ?? "https://api.checkout.infinitepay.io",
  infinitePayApiKey: process.env.INFINITEPAY_API_KEY ?? "",
  infinitePayHandle: process.env.INFINITEPAY_HANDLE ?? "",
  infinitePayWebhookEnabled: process.env.INFINITEPAY_WEBHOOK_ENABLED ?? "true",
  infinitePayWebhookSecret: process.env.INFINITEPAY_WEBHOOK_SECRET ?? "",
  blingApiBaseUrl: process.env.BLING_API_BASE_URL ?? "https://api.bling.com.br/Api/v3",
  blingOAuthBaseUrl: process.env.BLING_OAUTH_BASE_URL ?? "https://bling.com.br/Api/v3",
  blingClientId: process.env.BLING_CLIENT_ID ?? "",
  blingClientSecret: process.env.BLING_CLIENT_SECRET ?? "",
  blingNfeNaturezaOperacaoId: process.env.BLING_NFE_NATUREZA_OPERACAO_ID ?? "",
  blingNfeLojaId: process.env.BLING_NFE_LOJA_ID ?? "",
  blingNfeLojaNumero: process.env.BLING_NFE_LOJA_NUMERO ?? "",
  blingNfePaymentMethodId: process.env.BLING_NFE_PAYMENT_METHOD_ID ?? "",
  blingNfeDefaultContribuinte: process.env.BLING_NFE_DEFAULT_CONTRIBUINTE ?? "9",
  blingNfeDefaultNcm: process.env.BLING_NFE_DEFAULT_NCM ?? "",
  blingNfeDefaultOrigem: process.env.BLING_NFE_DEFAULT_ORIGEM ?? "0",
  blingNfeAutoCreateOnPayment: process.env.BLING_NFE_AUTO_CREATE_ON_PAYMENT ?? "false",
  blingNfeAutoSendSefazOnPayment: process.env.BLING_NFE_AUTO_SEND_SEFAZ_ON_PAYMENT ?? "false",
  blingNfeAutoSendEmailOnPayment: process.env.BLING_NFE_AUTO_SEND_EMAIL_ON_PAYMENT ?? "false",
  siteUrl: getSiteUrl(),
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export function isAssistedCheckoutEnabled() {
  return env.enableAssistedCheckout !== "false";
}

export function isPopFlixEnabled() {
  return env.enablePopFlix === "true";
}

export function isRafflesEnabled() {
  return env.enableRaffles === "true";
}

export function isRewardsEnabled() {
  return env.enableRewards === "true";
}

export function hasInfinitePayCheckoutEnv() {
  return Boolean(env.infinitePayApiBaseUrl && env.infinitePayHandle);
}

export function hasBlingNfeEnv() {
  return Boolean(
    env.blingApiBaseUrl &&
    env.blingNfeNaturezaOperacaoId &&
    env.blingClientId &&
    env.blingClientSecret,
  );
}

export function hasBlingOAuthRefreshEnv() {
  return Boolean(env.blingOAuthBaseUrl && env.blingClientId && env.blingClientSecret);
}

export function isBlingNfeAutoSendSefazOnPaymentEnabled() {
  return env.blingNfeAutoSendSefazOnPayment === "true";
}

export function isBlingNfeAutoCreateOnPaymentEnabled() {
  return env.blingNfeAutoCreateOnPayment === "true" || isBlingNfeAutoSendSefazOnPaymentEnabled();
}

export function isBlingNfeAutoSendEmailOnPaymentEnabled() {
  return env.blingNfeAutoSendEmailOnPayment === "true";
}

export function hasSupabasePublicEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasSupabaseAdminEnv() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function isDevelopmentMockAllowed() {
  return process.env.NODE_ENV !== "production";
}
