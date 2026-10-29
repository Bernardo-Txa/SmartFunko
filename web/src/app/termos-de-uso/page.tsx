import type { Metadata } from "next";
import { TermsContent } from "@/components/legal/legal-document-content";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermsPage() {
  return (
    <StaticPage title="Termos de Uso">
      <TermsContent />
    </StaticPage>
  );
}

