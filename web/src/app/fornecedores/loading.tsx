import { ProductGridSkeleton } from "@/components/storefront/product-grid";

export default function SuppliersLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-10 w-72 max-w-full rounded bg-slate-800" />
      <ProductGridSkeleton count={6} />
    </div>
  );
}
