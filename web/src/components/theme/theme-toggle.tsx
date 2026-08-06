"use client";

import { Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-strong)] ${className}`}
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      <Sun size={16} aria-hidden="true" />
      <span className="hidden sm:inline">Tema</span>
    </button>
  );
}
