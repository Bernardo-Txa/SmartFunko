import { Gem } from "lucide-react";

export function RareImageFallback({ label = "Acervo Raro" }: { label?: string }) {
  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[14px] border border-amber-200/18 bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,0.18),rgba(2,6,23,0.92)_62%)]">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/30 bg-amber-200/10 text-amber-100">
          <Gem size={26} aria-hidden="true" />
        </span>
        <span className="max-w-36 text-xs font-black uppercase tracking-[0.18em] text-amber-100/80">
          {label}
        </span>
      </div>
    </div>
  );
}
