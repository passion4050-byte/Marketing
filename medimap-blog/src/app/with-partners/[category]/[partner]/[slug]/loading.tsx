/**
 * Round 125 (2026-07-05) — 파트너 글 상세 로딩 스켈레톤 (blog/[slug]/loading 과 동일 목적).
 * force-dynamic 상세가 DB 조회 동안 멈춰 보이던 것 → 클릭 즉시 전환 피드백.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[860px] animate-pulse px-6 py-14 md:py-20 lg:px-10">
      <div className="h-3 w-56 rounded bg-stone-200" />
      <div className="mt-8 h-9 w-full rounded bg-stone-200" />
      <div className="mt-3 h-9 w-2/3 rounded bg-stone-200" />
      <div className="mt-6 h-3 w-44 rounded bg-stone-200" />
      <div className="mt-10 aspect-[16/9] w-full rounded-none bg-stone-200" />
      <div className="mt-10 space-y-4">
        <div className="h-4 w-full rounded bg-stone-100" />
        <div className="h-4 w-full rounded bg-stone-100" />
        <div className="h-4 w-5/6 rounded bg-stone-100" />
        <div className="h-4 w-full rounded bg-stone-100" />
        <div className="h-4 w-3/4 rounded bg-stone-100" />
      </div>
    </main>
  );
}
