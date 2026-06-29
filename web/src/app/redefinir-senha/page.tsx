import type { Metadata } from "next";
import { PasswordResetForm } from "./password-reset-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <PasswordResetForm />
    </div>
  );
}
