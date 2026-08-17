import Link from "next/link";
import { isPopFlixEnabled } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[#020617]/72">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-[var(--muted)] sm:px-6 md:grid-cols-[1.6fr_1fr_0.8fr] lg:px-8">
        <div className="space-y-3">
          <strong className="block text-[var(--foreground)]">Smart Funkos</strong>
          <p>Vendas assistidas com carrinho, link de pagamento e historico de pedidos.</p>
          <div className="space-y-1 text-xs leading-5">
            <p>
              <span className="font-semibold text-[var(--foreground)]">CNPJ:</span> 57.923.879/0001-60
            </p>
            <p>
              <span className="font-semibold text-[var(--foreground)]">Sede:</span> Avenida Anders, 14,
              Edificio Santos 4, sala 410, Nova Itaparica, Vila Velha - ES
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-center">
          {isPopFlixEnabled() ? (
            <Link href="/popflix" className="hover:text-[var(--foreground)]">
              PopFlix
            </Link>
          ) : null}
          <Link href="/pre-vendas" className="hover:text-[var(--foreground)]">
            Pre-vendas
          </Link>
          <Link href="/politica-de-envio" className="hover:text-[var(--foreground)]">
            Envio
          </Link>
          <Link href="/trocas-e-devolucoes" className="hover:text-[var(--foreground)]">
            Trocas
          </Link>
          <Link href="/privacidade" className="hover:text-[var(--foreground)]">
            Privacidade
          </Link>
        </div>
        <div className="md:text-right">
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--foreground)]"
          >
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
