import {
  getCatalogProductsPage,
  type CatalogProductFilter,
  type CatalogProductSort,
} from "@/lib/catalog";
import { publicCorsPreflight, withPublicCors } from "@/server/http/cors";

const filters: CatalogProductFilter[] = ["all", "new", "ready", "order", "preorder", "specials"];
const sorts: CatalogProductSort[] = [
  "name",
  "newest",
  "price_asc",
  "price_desc",
  "ready_first",
  "specials_first",
];

function normalizeFilter(value: string | null): CatalogProductFilter {
  return filters.find((filter) => filter === value) ?? "all";
}

function normalizeSort(value: string | null): CatalogProductSort | undefined {
  return sorts.find((sort) => sort === value);
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
    sort: normalizeSort(searchParams.get("sort")),
    subcategory: searchParams.get("subcategory") ?? undefined,
    supplier: searchParams.get("supplier") ?? undefined,
  });

  return Response.json(
    {
      data: products.data,
      meta: products.meta,
    },
    {
      headers: withPublicCors({
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      }),
    },
  );
}

export function OPTIONS() {
  return publicCorsPreflight();
}
