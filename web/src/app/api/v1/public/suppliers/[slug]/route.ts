import { getCatalogSupplierBySlug } from "@/lib/catalog";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const supplier = await getCatalogSupplierBySlug(slug);

  if (!supplier) {
    return Response.json({ error: "Supplier not found" }, { status: 404 });
  }

  return Response.json(
    {
      data: supplier,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  );
}
