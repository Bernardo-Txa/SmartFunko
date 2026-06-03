import { getCatalogFranchises } from "@/lib/catalog";

export async function GET() {
  const franchises = await getCatalogFranchises();

  return Response.json(
    {
      data: franchises,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  );
}
