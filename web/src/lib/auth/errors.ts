import type { AuthError } from "@supabase/supabase-js";

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getAuthErrorText(error: AuthError) {
  return `${error.code ?? ""} ${error.message}`.toLowerCase();
}

export function isRateLimitError(error: AuthError) {
  const text = getAuthErrorText(error);

  return (
    error.status === 429 ||
    text.includes("rate limit") ||
    text.includes("too many") ||
    text.includes("email rate limit") ||
    text.includes("over_email_send_rate_limit")
  );
}

export function isEmailNotConfirmedError(error: AuthError) {
  const text = getAuthErrorText(error);

  return (
    text.includes("email not confirmed") ||
    text.includes("email_not_confirmed") ||
    text.includes("not confirmed")
  );
}

export function isInvalidCredentialsError(error: AuthError) {
  const text = getAuthErrorText(error);

  return (
    error.status === 400 ||
    text.includes("invalid login credentials") ||
    text.includes("invalid credentials") ||
    text.includes("invalid_grant")
  );
}

export function isWeakPasswordError(error: AuthError) {
  const text = getAuthErrorText(error);

  return (
    text.includes("weak password") ||
    text.includes("weak_password") ||
    text.includes("password is too weak") ||
    text.includes("password should be")
  );
}

export function isInvalidEmailError(error: AuthError) {
  const text = getAuthErrorText(error);

  return (
    text.includes("invalid email") ||
    text.includes("email_address_invalid") ||
    text.includes("email address is invalid")
  );
}

export function isSessionExpiredError(error: AuthError) {
  const text = getAuthErrorText(error);

  return (
    error.status === 401 ||
    error.status === 403 ||
    text.includes("session") ||
    text.includes("jwt expired") ||
    text.includes("invalid jwt") ||
    text.includes("not authenticated")
  );
}

export function isEmailEnumerationSafeError(error: AuthError) {
  const text = getAuthErrorText(error);

  return (
    text.includes("user not found") ||
    text.includes("not found") ||
    text.includes("email not found") ||
    text.includes("not registered") ||
    text.includes("signup disabled")
  );
}
