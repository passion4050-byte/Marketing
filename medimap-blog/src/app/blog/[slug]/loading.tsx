/**
 * Round 125 (2026-07-05) — 글 상세 로딩 스켈레톤.
 * 목록→상세가 첫 방문 시 SSR(+DB 콜드 커넥션)로 수 초 걸리는데 화면이 멈춰 있어
 * "클릭이 안 먹히는 느낌"(사용자 지적). loading.tsx 로 클릭 즉시 전환 피드백 제공.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[760px] animate-pulse px-6 py-14 md:py-20">
      <div className="h-3 w-40 rounded bg-stone-200" />
      <div className="mt-6 h-9 w-full rounded bg-stone-200" />
      <div className="mt-3 h-9 w-3/4 rounded bg-stone-200" />
      <div className="mt-6 h-3 w-52 rounded bg-stone-200" />
      <div className="mt-10 aspect-[16/9] w-full rounded-xl bg-stone-200" />
      <div className="mt-10 space-y-4">
        <div className="h-4 w-full rounded bg-stone-100" />
        <div className="h-4 w-full rounded bg-stone-100" />
        <div className="h-4 w-5/6 rounded bg-stone-100" />
        <div className="h-4 w-full rounded bg-stone-100" />
        <div className="h-4 w-2/3 rounded bg-stone-100" />
      </div>
    </main>
  );
}
