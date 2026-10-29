import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/legal-document-content";
import { StaticPage } from "@/components/layout/static-page";

export const metadata: Metadata = {
  title: "Privacidade",
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Política de Privacidade">
      <PrivacyContent />
    </StaticPage>
  );
}
