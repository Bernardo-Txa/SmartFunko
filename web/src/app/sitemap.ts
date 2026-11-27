import type { MetadataRoute } from "next";
import { getCatalogProducts, getCatalogSuppliers } from "@/lib/catalog";
import { isPopFlixEnabled, isRafflesEnabled } from "@/lib/env";
import { canonicalUrl } from "@/lib/seo";
import { readyStockCampaign } from "@/lib/ready-stock-campaign";
import { RaffleService } from "@/server/raffles/raffle-service";
import { RareCollectibleService } from "@/server/rare-collectibles/rare-collectible-service";
import type { RaffleCampaign } from "@/components/raffles/raffle-types";

const SITEMAP_SOURCE_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, source: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<T>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`Sitemap source timed out: ${source}`)),
      SITEMAP_SOURCE_TIMEOUT_MS,
    );
  });

  return Promise.race([promise, deadline]).finally(() => clearTimeout(timeout));
}

function entry(
  path: string,
  options: {
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    lastModified?: Date | string;
    priority: number;
  },
): MetadataRoute.Sitemap[number] {
  return {
    changeFrequency: options.changeFrequency,
    lastModified: options.lastModified ?? new Date(),
    priority: options.priority,
    url: canonicalUrl(path),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    entry("/", { changeFrequency: "daily", priority: 1 }),
    entry("/catalogo", { changeFrequency: "daily", priority: 0.9 }),
    entry("/fornecedores", { changeFrequency: "weekly", priority: 0.7 }),
    entry("/pre-vendas", { changeFrequency: "daily", priority: 0.75 }),
    entry("/pronta-entrega", { changeFrequency: "daily", priority: 1 }),
    entry("/acervo-raro", { changeFrequency: "weekly", priority: 0.8 }),
    entry("/privacidade", { changeFrequency: "yearly", priority: 0.35 }),
    entry("/termos-de-uso", { changeFrequency: "yearly", priority: 0.35 }),
  ];

  if (readyStockCampaign.exclusiveMode) {
    return routes.filter((route) =>
      ["/pronta-entrega", "/privacidade", "/termos-de-uso"].some((path) =>
        route.url.endsWith(path),
      ),
    );
  }

  if (isPopFlixEnabled()) {
    routes.push(
      entry("/popflix", { changeFrequency: "weekly", priority: 0.8 }),
      entry("/popflix/assinar", { changeFrequency: "weekly", priority: 0.7 }),
    );
  }

  const [suppliersResult, productsResult, rareItemsResult] = await Promise.allSettled([
    withTimeout(getCatalogSuppliers(), "suppliers"),
    withTimeout(getCatalogProducts({ pageSize: 60, sort: "newest" }), "products"),
    withTimeout(new RareCollectibleService().listPublicRareCollectibles(), "rare collectibles"),
  ]);

  if (suppliersResult.status === "fulfilled") {
    const suppliers = suppliersResult.value;

    routes.push(
      ...suppliers.map((supplier) =>
        entry(`/fornecedores/${supplier.slug}`, {
          changeFrequency: "weekly",
          priority: 0.65,
        }),
      ),
    );
  } else {
    console.error("Failed to load suppliers for sitemap", suppliersResult.reason);
  }

  if (productsResult.status === "fulfilled") {
    const products = productsResult.value;

    routes.push(
      ...products.map((product) =>
        entry(`/produto/${product.slug}`, {
          changeFrequency: "weekly",
          lastModified: product.createdAt,
          priority: 0.8,
        }),
      ),
    );
  } else {
    console.error("Failed to load products for sitemap", productsResult.reason);
  }

  if (rareItemsResult.status === "fulfilled") {
    const rareItems = rareItemsResult.value;

    routes.push(
      ...rareItems.all.map((item) =>
        entry(`/acervo-raro/${item.slug}`, {
          changeFrequency: item.status === "available" ? "daily" : "weekly",
          lastModified: item.updatedAt,
          priority: item.isFeatured ? 0.82 : 0.72,
        }),
      ),
    );
  } else {
    console.error("Failed to load rare collectibles for sitemap", rareItemsResult.reason);
  }

  if (isRafflesEnabled()) {
    routes.push(entry("/rifas", { changeFrequency: "daily", priority: 0.7 }));

    try {
      const raffles = (await withTimeout(
        new RaffleService().listPublicRaffleCampaigns(),
        "raffles",
      )) as unknown as RaffleCampaign[];
      const publicRaffles = raffles.filter((raffle) => raffle.status !== "cancelled");

      routes.push(
        ...publicRaffles.map((raffle) =>
          entry(`/rifas/${raffle.slug}`, {
            changeFrequency: raffle.status === "open" ? "daily" : "weekly",
            lastModified: raffle.created_at,
            priority: raffle.status === "open" ? 0.75 : 0.55,
          }),
        ),
      );
    } catch (error) {
      console.error("Failed to load raffles for sitemap", error);
    }
  }

  return routes;
}
