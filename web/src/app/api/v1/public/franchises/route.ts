import { getCatalogFranchises } from "@/lib/catalog";

export async function GET() {
  const franchises = await getCatalogFranchises();

  return Response.json({
    data: franchises,
  });
}
