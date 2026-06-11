import { getCatalogProductBySlug } from "@/lib/catalog";
import { publicCorsPreflight, withPublicCors } from "@/server/http/cors";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

  if (!product) {
    return Response.json(
      { error: "Product not found" },
      { headers: withPublicCors(), status: 404 },
    );
  }

  return Response.json(
    {
      data: product,
    },
    {
      headers: withPublicCors({
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      }),
    },
  );
}

export function OPTIONS() {
  return publicCorsPreflight();
}
