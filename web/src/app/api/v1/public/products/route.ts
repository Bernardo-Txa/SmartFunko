import { getCatalogProductsPage, type CatalogProductFilter } from "@/lib/catalog";

const filters: CatalogProductFilter[] = ["all", "ready", "order", "preorder", "specials"];

function normalizeFilter(value: string | null): CatalogProductFilter {
  return filters.find((filter) => filter === value) ?? "all";
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const products = await getCatalogProductsPage({
    category: searchParams.get("category") ?? undefined,
    filter: normalizeFilter(searchParams.get("filter")),
    franchise: searchParams.get("franchise") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 24),
    query: searchParams.get("q") ?? undefined,
    subcategory: searchParams.get("subcategory") ?? undefined,
    supplier: searchParams.get("supplier") ?? undefined,
  });

  return Response.json(
    {
      data: products.data,
      meta: products.meta,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
