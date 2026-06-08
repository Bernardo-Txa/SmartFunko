import { ProductGridSkeleton } from "@/components/storefront/product-grid";

export default function CatalogLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6">
        <div className="h-3 w-32 rounded bg-yellow-300/40" />
        <div className="mt-3 h-10 w-72 max-w-full rounded bg-slate-800" />
        <div className="mt-3 h-5 w-[32rem] max-w-full rounded bg-slate-800" />
      </section>
      <div className="mb-6 h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      <div className="mb-4 h-5 w-60 rounded bg-slate-800" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
