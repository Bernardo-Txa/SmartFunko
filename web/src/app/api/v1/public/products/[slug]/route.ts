import { getProductBySlug } from "@/lib/mock-data";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  return Response.json({
    data: product,
  });
}
