import { getCatalogProductBySlug } from "@/lib/catalog";
import { corsPreflightResponse, withCors } from "@/server/http/cors";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

  if (!product) {
    return withCors(request, Response.json(
      { error: "Product not found" },
      { status: 404 },
    ));
  }

  return withCors(request, Response.json(
    {
      data: product,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  ));
}

export function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
