/**
 * Round 125-B (2026-07-05) — /with-partners 디렉토리 로딩 스켈레톤.
 * 하위 [category]/[partner] 목록 페이지에도 상속 적용 ([slug] 상세는 자체 스켈레톤).
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] animate-pulse px-6 py-16 lg:px-10">
      <div className="h-3 w-52 rounded bg-stone-200" />
      <div className="mt-6 h-10 w-3/5 rounded bg-stone-200" />
      <div className="mt-3 h-10 w-2/5 rounded bg-stone-200" />
      <div className="mt-16 space-y-10 border-t border-stone-200 pt-10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[64px_1fr_160px] items-center gap-8 border-b border-stone-100 pb-10">
            <div className="h-9 w-12 rounded bg-stone-200" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-stone-100" />
              <div className="h-6 w-40 rounded bg-stone-200" />
              <div className="h-3 w-52 rounded bg-stone-100" />
            </div>
            <div className="aspect-[16/10] rounded-none bg-stone-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
