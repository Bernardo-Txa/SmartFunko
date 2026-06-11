import type { MetadataRoute } from "next";
import { getCatalogProducts, getCatalogSuppliers } from "@/lib/catalog";
import { isRafflesEnabled } from "@/lib/env";
import { canonicalUrl } from "@/lib/seo";
import { RaffleService } from "@/server/raffles/raffle-service";
import type { RaffleCampaign } from "@/components/raffles/raffle-types";

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
  ];

  try {
    const suppliers = await getCatalogSuppliers();

    routes.push(
      ...suppliers.map((supplier) =>
        entry(`/fornecedores/${supplier.slug}`, {
          changeFrequency: "weekly",
          priority: 0.65,
        }),
      ),
    );
  } catch (error) {
    console.error("Failed to load suppliers for sitemap", error);
  }

  try {
    const products = await getCatalogProducts({
      pageSize: 60,
      sort: "newest",
    });

    routes.push(
      ...products.map((product) =>
        entry(`/produto/${product.slug}`, {
          changeFrequency: "weekly",
          lastModified: product.createdAt,
          priority: 0.8,
        }),
      ),
    );
  } catch (error) {
    console.error("Failed to load products for sitemap", error);
  }

  if (isRafflesEnabled()) {
    routes.push(entry("/rifas", { changeFrequency: "daily", priority: 0.7 }));

    try {
      const raffles = (await new RaffleService().listPublicRaffleCampaigns()) as unknown as RaffleCampaign[];
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
