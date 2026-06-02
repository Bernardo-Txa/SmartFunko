import { products } from "@/lib/mock-data";

export async function GET() {
  return Response.json({
    data: products,
  });
}
