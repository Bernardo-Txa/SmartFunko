import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CollabDetailPage({ params }: Props) {
  const { slug } = await params;

  redirect(`/fornecedores/${slug}`);
}
