import { getCatalogFranchises } from "@/lib/catalog";
import { corsPreflightResponse, withCors } from "@/server/http/cors";

export async function GET(request: Request) {
  const franchises = await getCatalogFranchises();

  return withCors(request, Response.json(
    {
      data: franchises,
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
