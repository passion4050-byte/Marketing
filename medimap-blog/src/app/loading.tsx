/**
 * Round 125-B (2026-07-05) — 전 라우트 공통 로딩 스켈레톤.
 * force-dynamic 페이지들(홈 외 대부분)이 DB 조회 동안 화면이 멈춰
 * "클릭이 안 먹히는 느낌"을 주던 것 → 어떤 내비게이션이든 즉시 전환 피드백.
 * 자체 loading.tsx 가 있는 세그먼트(blog/[slug], with-partners/.../[slug],
 * /blog, /with-partners)는 그쪽이 우선 적용된다.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] animate-pulse px-6 py-16 lg:px-10">
      <div className="h-3 w-36 rounded bg-stone-200" />
      <div className="mt-6 h-10 w-2/3 rounded bg-stone-200" />
      <div className="mt-3 h-4 w-1/2 rounded bg-stone-100" />
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        <div className="space-y-3">
          <div className="aspect-[16/10] rounded-none bg-stone-200" />
          <div className="h-4 w-5/6 rounded bg-stone-100" />
          <div className="h-4 w-2/3 rounded bg-stone-100" />
        </div>
        <div className="space-y-3">
          <div className="aspect-[16/10] rounded-none bg-stone-200" />
          <div className="h-4 w-5/6 rounded bg-stone-100" />
          <div className="h-4 w-2/3 rounded bg-stone-100" />
        </div>
        <div className="space-y-3">
          <div className="aspect-[16/10] rounded-none bg-stone-200" />
          <div className="h-4 w-5/6 rounded bg-stone-100" />
          <div className="h-4 w-2/3 rounded bg-stone-100" />
        </div>
      </div>
    </main>
  );
}
