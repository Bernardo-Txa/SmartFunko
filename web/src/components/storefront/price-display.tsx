import { formatCurrency } from "@/lib/format";

export function PriceDisplay({
  marketPrice,
  price,
  size = "md",
}: {
  marketPrice?: number;
  price: number;
  size?: "sm" | "md" | "lg";
}) {
  const priceClass =
    size === "lg"
      ? "text-4xl"
      : size === "sm"
        ? "text-lg"
        : "text-2xl";

  return (
    <div>
      {marketPrice ? (
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">
          De <span className="line-through">{formatCurrency(marketPrice)}</span>
        </p>
      ) : null}
      <strong className={`${priceClass} block font-black text-[var(--foreground)]`}>
        {formatCurrency(price)}
      </strong>
      {marketPrice && marketPrice > price ? (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Economia estimada de {formatCurrency(marketPrice - price)}
        </p>
      ) : null}
    </div>
  );
}

