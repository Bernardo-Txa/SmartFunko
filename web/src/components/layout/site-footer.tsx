import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-[var(--muted)] sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <strong className="block text-[var(--foreground)]">Smart Funkos</strong>
          <span>Vendas assistidas pelo WhatsApp com historico de pedidos.</span>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-center">
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
