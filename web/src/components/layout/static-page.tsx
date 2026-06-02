export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <article className="rounded-lg border border-[var(--border)] bg-white p-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{title}</h1>
        <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--muted)]">
          {children}
        </div>
      </article>
    </div>
  );
}
