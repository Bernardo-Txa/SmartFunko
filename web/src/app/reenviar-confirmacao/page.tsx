import type { Metadata } from "next";
import { ResendConfirmationForm } from "./resend-confirmation-form";

export const metadata: Metadata = {
  title: "Reenviar confirmação",
};

export default function ResendConfirmationPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <ResendConfirmationForm />
    </div>
  );
}
