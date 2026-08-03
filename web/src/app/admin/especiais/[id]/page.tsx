import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSpecialDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/acervo-raro/${id}`);
}
