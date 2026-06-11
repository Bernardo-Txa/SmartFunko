import type { Metadata } from "next";
import { Heart, MessageCircle, PackageCheck, ShieldCheck, Sparkles, Users } from "lucide-react";
import { CategoryTile } from "@/components/storefront/category-tile";
import { CommercialSection } from "@/components/storefront/commercial-section";
import { HeroBanner } from "@/components/storefront/hero-banner";
import { ProductCarousel } from "@/components/storefront/product-carousel";
import { SupplierTile } from "@/components/storefront/supplier-tile";
import { createWebsiteJsonLd, ogImages } from "@/lib/seo";
import {
  getCatalogFranchises,
  getCatalogProducts,
  getCatalogSuppliers,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: {
    absolute: "Smart Funkos — Colecionáveis, Funkos e comunidade geek",
  },
  description:
    "Compre, acompanhe pedidos, participe de rifas e descubra colecionáveis especiais na Smart Funkos.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Smart Funkos — Colecionáveis, Funkos e comunidade geek",
    description:
      "Compre, acompanhe pedidos, participe de rifas e descubra colecionáveis especiais na Smart Funkos.",
    images: ogImages(),
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Compre, acompanhe pedidos, participe de rifas e descubra colecionáveis especiais na Smart Funkos.",
    images: ["/og/smart-funkos-og.png"],
    title: "Smart Funkos — Colecionáveis, Funkos e comunidade geek",
  },
};

const commercialTiles = [
  {
    description: "Produtos disponíveis aparecem com badge no catálogo único.",
    href: "/catalogo",
    label: "Pronta-entrega",
  },
  {
    description: "Itens acompanhados desde a abertura da pré-venda.",
    href: "/catalogo",
    label: "Pré-venda",
  },
  {
    description: "Chase, exclusivos, glow e peças com rótulos especiais.",
    href: "/catalogo",
    label: "Specials",
  },
  {
    description: "Entradas recentes do catálogo ativo.",
    href: "/catalogo",
    label: "Novidades",
  },
  {
    description: "Importações e pedidos sob consulta pelo atendimento.",
    href: "/catalogo",
    label: "Encomendas",
  },
  {
    description: "Piticas, Copag, Panini e collabs ativos.",
    href: "/fornecedores",
    label: "Fornecedores/Collabs",
  },
];

const trustItems = [
  {
    icon: ShieldCheck,
    label: "Produto original",
    text: "Curadoria e cadastro operacional para manter informações claras.",
  },
  {
    icon: MessageCircle,
    label: "Atendimento próximo",
    text: "WhatsApp fica como apoio para dúvidas e combinações especiais.",
  },
  {
    icon: PackageCheck,
    label: "Acompanhamento",
    text: "Pedidos manuais continuam visíveis na conta do cliente.",
  },
  {
    icon: Users,
    label: "Comunidade",
    text: "Favoritos ajudam a Smart Funkos entender a demanda real.",
  },
];

export default async function Home() {
  const [readyProducts, specialProducts, newProducts, suppliers, franchises] =
    await Promise.all([
      getCatalogProducts({ filter: "ready", pageSize: 8, sort: "ready_first" }),
      getCatalogProducts({ filter: "specials", pageSize: 10, sort: "specials_first" }),
      getCatalogProducts({ filter: "new", pageSize: 8, sort: "newest" }),
      getCatalogSuppliers(),
      getCatalogFranchises(),
    ]);

  const featuredProducts = [
    ...specialProducts.filter((product) => product.imageUrl),
    ...readyProducts.filter((product) => product.imageUrl),
    ...newProducts.filter((product) => product.imageUrl),
  ].filter(
    (product, index, products) =>
      products.findIndex((candidate) => candidate.id === product.id) === index,
  );

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(createWebsiteJsonLd()) }}
      />
      <HeroBanner products={featuredProducts.length > 0 ? featuredProducts : specialProducts.slice(0, 4)} />

      <CommercialSection
        eyebrow="Catálogo único"
        title="Explore por atributos do produto"
        description="Pronta-entrega, pré-venda, encomenda e specials aparecem como informações do produto dentro do mesmo catálogo Smart Funkos."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {commercialTiles.map((tile) => (
            <CategoryTile key={tile.label} {...tile} />
          ))}
        </div>
      </CommercialSection>

      <ProductCarousel
        title="Produtos em destaque"
        description="Prioridade para itens com imagem, specials e pronta-entrega."
        href="/catalogo"
        products={featuredProducts.slice(0, 10)}
      />

      <CommercialSection
        eyebrow="Universos"
        title="Franquias em destaque"
        description="Entre por franquia ou universo e refine depois por busca, categoria e ordenação."
        ctaHref="/catalogo"
        ctaLabel="Explorar catálogo"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {franchises.slice(0, 8).map((franchise) => (
            <CategoryTile
              key={franchise.id}
              href={`/catalogo?franchise=${franchise.slug}`}
              label={franchise.name}
              description="Produtos ativos desse universo no catálogo."
            />
          ))}
          {franchises.length === 0
            ? ["One Piece", "Marvel", "DC", "Disney", "Anime", "Harry Potter", "Star Wars"].map(
                (label) => (
                  <CategoryTile
                    key={label}
                    href={`/catalogo?q=${encodeURIComponent(label)}`}
                    label={label}
                    description="Busca pronta para este universo."
                  />
                ),
              )
            : null}
        </div>
      </CommercialSection>

      <CommercialSection
        eyebrow="Collabs"
        title="Fornecedores e parceiros"
        description="Coleções vinculadas ao cadastro real de fornecedores ativos."
        ctaHref="/fornecedores"
        ctaLabel="Ver fornecedores"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {suppliers.slice(0, 6).map((supplier) => (
            <SupplierTile key={supplier.id} supplier={supplier} />
          ))}
        </div>
      </CommercialSection>

      <CommercialSection
        eyebrow="Fluxo assistido"
        title="Como funciona"
        description="O site organiza desejo e intenção de compra; a Smart aprova e libera pagamento por link."
      >
        <div id="como-funciona" className="grid gap-4 md:grid-cols-4">
          {[
            ["Escolha o produto", "Use catálogo, vitrines e favoritos para montar sua lista."],
            ["Envie o carrinho", "O pedido entra em análise para confirmar disponibilidade e valores."],
            ["Pague pelo link", "Após aprovação, o checkout seguro libera Pix ou cartão."],
            ["Acompanhe o status", "Pedidos vinculados aparecem na conta do cliente."],
          ].map(([label, text], index) => (
            <div
              key={label}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--yellow)] text-sm font-black text-[#020617]">
                {index + 1}
              </span>
              <strong className="mt-4 block text-sm text-[var(--foreground)]">{label}</strong>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
            </div>
          ))}
        </div>
      </CommercialSection>

      <CommercialSection
        eyebrow="Confiança"
        title="Por que comprar com a Smart Funkos"
        description="A experiência premium fica por cima do mesmo core operacional: pedido, estoque, pagamento manual, caixa e acompanhamento."
      >
        <div className="grid gap-4 md:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <Icon className="text-[var(--accent)]" size={24} aria-hidden="true" />
                <strong className="mt-4 block text-sm text-[var(--foreground)]">
                  {item.label}
                </strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.text}</p>
              </div>
            );
          })}
          <div className="rounded-lg border border-yellow-300/35 bg-yellow-300/10 p-5">
            <Sparkles className="text-[var(--yellow)]" size={24} aria-hidden="true" />
            <strong className="mt-4 block text-sm text-[var(--foreground)]">
              Pré-vendas e encomendas
            </strong>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Prazos são confirmados pelo atendimento antes da reserva manual.
            </p>
          </div>
          <div className="rounded-lg border border-pink-300/30 bg-pink-500/10 p-5">
            <Heart className="text-pink-200" size={24} aria-hidden="true" />
            <strong className="mt-4 block text-sm text-[var(--foreground)]">
              Favoritos reais
            </strong>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Sua lista ajuda a loja decidir compras e divulgações futuras.
            </p>
          </div>
        </div>
      </CommercialSection>
    </div>
  );
}
