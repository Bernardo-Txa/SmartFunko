"use client";

import { FormEvent, useState } from "react";
import { AtSign, KeyRound, ShieldCheck } from "lucide-react";
import { SmartButtonLoading } from "@/components/ui/smart-loading";
import {
  isInvalidEmailError,
  isRateLimitError,
  isSessionExpiredError,
  isValidEmail,
  isWeakPasswordError,
} from "@/lib/auth/errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PASSWORD_GENERIC_ERROR_MESSAGE =
  "Não foi possível alterar sua senha agora. Tente novamente.";
const EMAIL_CHANGE_SUCCESS_MESSAGE =
  "Enviamos um e-mail de confirmação para o novo endereço. A alteração só será concluída após a confirmação.";
const EMAIL_CHANGE_GENERIC_ERROR_MESSAGE =
  "Não foi possível solicitar a alteração de e-mail agora.";

export function AccountSecurityForm({ currentEmail }: { currentEmail: string | null }) {
  const normalizedCurrentEmail = currentEmail?.trim().toLowerCase() ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPasswordSubmitting) {
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    if (!newPassword) {
      setPasswordError("Informe a nova senha.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (!confirmPassword) {
      setPasswordError("Confirme a nova senha.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas precisam ser iguais.");
      return;
    }

    setIsPasswordSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsPasswordSubmitting(false);

    if (updateError) {
      if (isWeakPasswordError(updateError)) {
        setPasswordError("Use uma senha mais forte.");
        return;
      }

      if (isSessionExpiredError(updateError)) {
        setPasswordError("Sua sessão expirou. Entre novamente para alterar sua senha.");
        return;
      }

      setPasswordError(PASSWORD_GENERIC_ERROR_MESSAGE);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Senha alterada com sucesso.");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEmailSubmitting) {
      return;
    }

    const normalizedNewEmail = newEmail.trim().toLowerCase();
    const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();
    setEmailError("");
    setEmailMessage("");

    if (!normalizedNewEmail) {
      setEmailError("Informe o novo e-mail.");
      return;
    }

    if (!isValidEmail(normalizedNewEmail)) {
      setEmailError("Informe um e-mail válido.");
      return;
    }

    if (!normalizedConfirmEmail) {
      setEmailError("Confirme o novo e-mail.");
      return;
    }

    if (normalizedNewEmail !== normalizedConfirmEmail) {
      setEmailError("Os e-mails precisam ser iguais.");
      return;
    }

    if (normalizedCurrentEmail && normalizedNewEmail === normalizedCurrentEmail) {
      setEmailError("O novo e-mail precisa ser diferente do atual.");
      return;
    }

    setIsEmailSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser(
      {
        email: normalizedNewEmail,
      },
      {
        emailRedirectTo: `${window.location.origin}/auth/confirmado`,
      },
    );

    setIsEmailSubmitting(false);

    if (updateError) {
      if (isRateLimitError(updateError)) {
        setEmailError(
          "Você solicitou muitas alterações em pouco tempo. Aguarde alguns minutos e tente novamente.",
        );
        return;
      }

      if (isInvalidEmailError(updateError)) {
        setEmailError("Informe um e-mail válido.");
        return;
      }

      if (isSessionExpiredError(updateError)) {
        setEmailError("Sua sessão expirou. Entre novamente para alterar seu e-mail.");
        return;
      }

      setEmailError(EMAIL_CHANGE_GENERIC_ERROR_MESSAGE);
      return;
    }

    setNewEmail("");
    setConfirmEmail("");
    setEmailMessage(EMAIL_CHANGE_SUCCESS_MESSAGE);
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 md:col-span-3">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 text-[var(--accent)]" size={24} aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Segurança da conta</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Gerencie senha e e-mail usando a sessão autenticada da sua conta.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <form className="space-y-4" noValidate onSubmit={handlePasswordSubmit}>
          <div>
            <h3 className="text-sm font-bold uppercase text-[var(--foreground)]">
              Alterar senha
            </h3>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Nova senha</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isPasswordSubmitting}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Digite a nova senha"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Confirmar nova senha
            </span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isPasswordSubmitting}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Repita a nova senha"
            />
          </label>

          {passwordError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {passwordError}
            </p>
          ) : null}
          {passwordMessage ? (
            <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
              {passwordMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPasswordSubmitting}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPasswordSubmitting ? (
              <SmartButtonLoading message="Alterando..." />
            ) : (
              <>
                <KeyRound size={16} aria-hidden="true" />
                Alterar senha
              </>
            )}
          </button>
        </form>

        <form className="space-y-4" noValidate onSubmit={handleEmailSubmit}>
          <div>
            <h3 className="text-sm font-bold uppercase text-[var(--foreground)]">
              Alterar e-mail
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              E-mail atual:{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {currentEmail ?? "Nao informado"}
              </span>
            </p>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">Novo e-mail</span>
            <input
              name="newEmail"
              type="email"
              autoComplete="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              disabled={isEmailSubmitting}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="novo@email.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Confirmar novo e-mail
            </span>
            <input
              name="confirmEmail"
              type="email"
              autoComplete="email"
              required
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              disabled={isEmailSubmitting}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="repita o novo e-mail"
            />
          </label>

          {emailError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {emailError}
            </p>
          ) : null}
          {emailMessage ? (
            <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
              {emailMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isEmailSubmitting}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-[#020617] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isEmailSubmitting ? (
              <SmartButtonLoading message="Enviando..." />
            ) : (
              <>
                <AtSign size={16} aria-hidden="true" />
                Enviar confirmação
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
