import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, PlugZap } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/server/auth/require-admin-page";
import { getBlingIntegrationStatus } from "@/server/bling/bling-token-service";
import { getRequestOriginFromHeaders } from "@/server/http/request-origin";

export const metadata: Metadata = {
  title: "Integracoes admin",
};

type Props = {
  searchParams?: Promise<{
    bling_oauth?: string;
  }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function IntegrationStatusBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-black uppercase ${
      connected
        ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
        : "border-yellow-300/40 bg-yellow-300/10 text-yellow-100"
    }`}
    >
      {connected ? "Conectado" : "Pendente"}
    </span>
  );
}

export default async function AdminIntegrationsPage({ searchParams }: Props) {
  await requireAdminPage("/admin/integracoes");

  const query = await searchParams;
  const requestHeaders = await headers();
  const status = await getBlingIntegrationStatus(getRequestOriginFromHeaders(requestHeaders));
  const oauthStatus = query?.bling_oauth === "connected" || query?.bling_oauth === "error"
    ? query.bling_oauth
    : null;

  return (
    <AdminShell title="Integracoes" description="Conexoes externas usadas pela operacao.">
      <div className="grid gap-4">
        {oauthStatus ? (
          <p className={`flex items-start gap-2 rounded-lg border p-3 text-sm font-semibold ${
            oauthStatus === "connected"
              ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
              : "border-red-300/30 bg-red-400/10 text-red-100"
          }`}
          >
            {oauthStatus === "connected" ? (
              <CheckCircle2 className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
            )}
            <span>
              {oauthStatus === "connected"
                ? "Bling conectado com sucesso."
                : "Nao foi possivel conectar o Bling. Confira se o Redirect URI cadastrado no Bling esta identico ao mostrado abaixo."}
            </span>
          </p>
        ) : null}

        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]">
                <PlugZap size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Bling</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Emissao e envio de NF-e dos pedidos.</p>
              </div>
            </div>
            <IntegrationStatusBadge connected={status.connected} />
          </div>

          <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Credenciais</dt>
              <dd className="mt-1 font-semibold text-[var(--foreground)]">
                {status.configured ? "Client ID e Secret configurados" : "Client ID ou Secret ausente"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Access token</dt>
              <dd className="mt-1 font-semibold text-[var(--foreground)]">
                {status.accessTokenValid ? "Valido" : status.connected ? "Expirado, sera renovado automaticamente" : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Expira em</dt>
              <dd className="mt-1 font-semibold text-[var(--foreground)]">{formatDateTime(status.expiresAt)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Ultima atualizacao</dt>
              <dd className="mt-1 font-semibold text-[var(--foreground)]">{formatDateTime(status.lastRefreshedAt)}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="bling-redirect-uri">
              Redirect URI
            </label>
            <input
              id="bling-redirect-uri"
              readOnly
              value={status.redirectUri}
              className="mt-2 h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none"
            />
            <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Cadastre exatamente esta URL no aplicativo Bling.</p>
          </div>

          {status.lastError ? (
            <p className="mt-4 flex items-start gap-2 rounded-md border border-red-300/30 bg-red-400/10 p-3 text-sm font-semibold text-red-100">
              <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
              <span>{status.lastError}</span>
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {status.configured ? (
              <Link
                href={`/api/v1/admin/bling/oauth/start?next=${encodeURIComponent("/admin/integracoes")}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-black text-slate-950 hover:brightness-110"
              >
                <KeyRound size={16} aria-hidden="true" />
                {status.connected ? "Reautorizar Bling" : "Conectar Bling"}
              </Link>
            ) : (
              <span className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)]">
                Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET
              </span>
            )}

            <Link
              href="https://www.bling.com.br/cadastro.aplicativos.php"
              target="_blank"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            >
              <ExternalLink size={16} aria-hidden="true" />
              Abrir Bling
            </Link>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
