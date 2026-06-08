import { FlaskConical } from "lucide-react";

export function RaffleExperimentalNotice() {
  return (
    <div className="rounded-lg border border-yellow-300/35 bg-yellow-300/10 p-4 text-sm text-yellow-100">
      <div className="flex gap-3">
        <FlaskConical className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
        <p>
          Rifas DEV 1.0 em modo experimental. Use somente para validacao interna:
          reserva temporaria, confirmacao manual de pagamento e sorteio manual nao
          representam fluxo pronto para producao.
        </p>
      </div>
    </div>
  );
}
