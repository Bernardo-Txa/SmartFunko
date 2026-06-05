const DEFAULT_CUSTOMER_PATH = "/conta/pedidos";
const DEFAULT_OWNER_PATH = "/admin/dashboard";

type AuthRole = "customer" | "admin" | "owner";

export function getDefaultAuthenticatedPath(role?: AuthRole | null) {
  return role === "owner" ? DEFAULT_OWNER_PATH : DEFAULT_CUSTOMER_PATH;
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, "https://smartfunko.local");

    if (parsed.origin !== "https://smartfunko.local") {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
