import type { Metadata } from "next";
import { EmailConfirmationStatus } from "./email-confirmation-status";

export const metadata: Metadata = {
  title: "E-mail confirmado",
};

export default function EmailConfirmedPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <EmailConfirmationStatus />
    </div>
  );
}
