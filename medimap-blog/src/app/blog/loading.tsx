/**
 * Round 125-B (2026-07-05) — /blog 허브 로딩 스켈레톤 (매거진 레이아웃 형태 유지).
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] animate-pulse px-6 py-14 lg:px-10">
      {/* Featured hero */}
      <div className="h-3 w-48 rounded bg-stone-200" />
      <div className="mt-8 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <div className="aspect-[16/10] rounded-xl bg-stone-200" />
        <div className="space-y-4 pt-4">
          <div className="h-3 w-24 rounded bg-stone-100" />
          <div className="h-8 w-full rounded bg-stone-200" />
          <div className="h-8 w-4/5 rounded bg-stone-200" />
          <div className="h-4 w-full rounded bg-stone-100" />
          <div className="h-4 w-2/3 rounded bg-stone-100" />
        </div>
      </div>
      {/* Latest list */}
      <div className="mt-16 space-y-8 border-t border-stone-200 pt-10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[48px_1fr] items-center gap-6 border-b border-stone-100 pb-8">
            <div className="h-8 w-8 rounded bg-stone-200" />
            <div className="space-y-2">
              <div className="h-5 w-3/4 rounded bg-stone-200" />
              <div className="h-3 w-1/3 rounded bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
