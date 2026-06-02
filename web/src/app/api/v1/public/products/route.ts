import { getCatalogProductsPage } from "@/lib/catalog";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const products = await getCatalogProductsPage({
    franchise: searchParams.get("franchise") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 24),
    query: searchParams.get("q") ?? undefined,
    status: (searchParams.get("status") ?? "all") as "all",
  });

  return Response.json({
    data: products.data,
    meta: products.meta,
  });
}
