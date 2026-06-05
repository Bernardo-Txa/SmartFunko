import { getCatalogSuppliers } from "@/lib/catalog";

export async function GET() {
  const suppliers = await getCatalogSuppliers();

  return Response.json(
    {
      data: suppliers,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  );
}
