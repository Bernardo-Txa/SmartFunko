import type { Metadata } from "next";
import type { Product } from "@/types/product";
import { getSiteUrl } from "@/lib/env";

export const SITE_NAME = "Smart Funkos";
export const DEFAULT_DESCRIPTION =
  "Loja e comunidade para colecionadores de Funko Pop, action figures, cards e colecionáveis.";
export const DEFAULT_OG_IMAGE_PATH = "/og/smart-funkos-og.png";

export function absoluteUrl(pathOrUrl: string) {
  const value = pathOrUrl.trim();

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value.startsWith("/") ? value : `/${value}`, getSiteUrl()).toString();
}

export function canonicalUrl(path: string) {
  return absoluteUrl(path);
}

export function cleanDescription(value: string | null | undefined, fallback: string) {
  const text = value?.replace(/\s+/g, " ").trim();
  return text && text.length > 0 ? text : fallback;
}

export function ogImages(imageUrl?: string | null, alt = SITE_NAME): NonNullable<Metadata["openGraph"]>["images"] {
  const url = absoluteUrl(imageUrl || DEFAULT_OG_IMAGE_PATH);

  if (!imageUrl) {
    return [
      {
        alt,
        height: 630,
        url,
        width: 1200,
      },
    ];
  }

  return [{ alt, url }];
}

export const defaultTwitter: Metadata["twitter"] = {
  card: "summary_large_image",
  description: DEFAULT_DESCRIPTION,
  images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
  title: SITE_NAME,
};

function productAvailability(product: Product) {
  if (product.status === "available") {
    return "https://schema.org/InStock";
  }

  if (product.status === "preorder" || product.status === "order_only") {
    return "https://schema.org/PreOrder";
  }

  return "https://schema.org/OutOfStock";
}

export function createProductJsonLd(product: Product) {
  const description = cleanDescription(
    product.description,
    `Confira ${product.name} na Smart Funkos. Produto para colecionadores com atendimento personalizado.`,
  );
  const images = (product.images?.length ? product.images : [product.imageUrl])
    .filter((image): image is string => Boolean(image))
    .map(absoluteUrl);
  const url = canonicalUrl(`/produto/${product.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    brand: {
      "@type": "Brand",
      name: product.franchise || SITE_NAME,
    },
    category: [product.category, product.subcategory].filter(Boolean).join(" / ") || undefined,
    description,
    image: images.length > 0 ? images : [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    name: product.name,
    offers:
      Number.isFinite(product.price) && product.price > 0
        ? {
            "@type": "Offer",
            availability: productAvailability(product),
            price: product.price.toFixed(2),
            priceCurrency: "BRL",
            url,
          }
        : undefined,
    sku: product.sku || undefined,
    url,
  };
}

export function createWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    potentialAction: {
      "@type": "SearchAction",
      queryInput: "required name=search_term_string",
      target: `${canonicalUrl("/catalogo")}?q={search_term_string}`,
    },
    publisher: {
      "@type": "Organization",
      logo: absoluteUrl("/brand/SmartFunkoIcone.png"),
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    url: getSiteUrl(),
  };
}

export function createRaffleWebPageJsonLd(input: {
  description: string;
  imageUrl?: string | null;
  slug: string;
  title: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    description: input.description,
    image: absoluteUrl(input.imageUrl || DEFAULT_OG_IMAGE_PATH),
    name: input.title,
    url: canonicalUrl(`/rifas/${input.slug}`),
  };
}
