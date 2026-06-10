import { FlaskConical } from "lucide-react";

export function RaffleExperimentalNotice() {
  return (
    <div className="rounded-lg border border-yellow-300/35 bg-yellow-300/10 p-4 text-sm text-[var(--foreground)]">
      <div className="flex gap-3">
        <FlaskConical className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
        <p>
          Módulo experimental para trabalho acadêmico e testes internos. Não utilizar para campanhas reais sem validação jurídica e operacional.
        </p>
      </div>
    </div>
  );
}
