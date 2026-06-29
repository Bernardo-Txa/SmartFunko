import type { Metadata } from "next";
import { PasswordResetRequestForm } from "./password-reset-request-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <PasswordResetRequestForm />
    </div>
  );
}
