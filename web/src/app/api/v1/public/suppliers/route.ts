import { getCatalogSuppliers } from "@/lib/catalog";
import { corsPreflightResponse, withCors } from "@/server/http/cors";

export async function GET(request: Request) {
  const suppliers = await getCatalogSuppliers();

  return withCors(request, Response.json(
    {
      data: suppliers,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  ));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
