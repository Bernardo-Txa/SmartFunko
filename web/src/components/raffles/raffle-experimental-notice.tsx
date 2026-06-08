import { FlaskConical } from "lucide-react";

export function RaffleExperimentalNotice() {
  return (
    <div className="rounded-lg border border-yellow-300/35 bg-yellow-300/10 p-4 text-sm text-yellow-100">
      <div className="flex gap-3">
        <FlaskConical className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
        <p>
          Módulo experimental de desenvolvimento.
        </p>
      </div>
    </div>
  );
}
