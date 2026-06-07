"use client";

import { useState } from "react";
import { ClipboardCopy } from "lucide-react";

export function CopyInterestedButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-bold text-[var(--foreground)] hover:bg-cyan-400/12"
    >
      <ClipboardCopy size={14} aria-hidden="true" />
      {copied ? "Copiado" : "Copiar lista"}
    </button>
  );
}

