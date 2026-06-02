import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Login admin",
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6 lg:px-8">
      <AuthForm mode="admin" redirectTo="/admin/dashboard" />
    </div>
  );
}
