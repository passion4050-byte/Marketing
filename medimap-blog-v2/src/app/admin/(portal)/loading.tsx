/**
 * Round 169 (2026-08-20) — 모바일: 어드민 포털 로딩 스켈레톤.
 *
 * 이전엔 loading 경계가 없어 서버 집계(수 초)가 끝날 때까지 흰 화면이었다.
 * 모바일 회선에서는 이 공백이 특히 길어 "멈춘 화면"으로 읽힌다.
 * 실제 KPI 그리드와 동일한 컬럼 구조(grid-cols-2 md:grid-cols-3 xl:grid-cols-6)로
 * 그려서 로드 완료 시 레이아웃 점프가 없도록 한다.
 */
export default function AdminPortalLoading() {
  return (
    <div className="mx-auto max-w-[1536px] px-4 py-5 md:px-6 lg:px-10" aria-busy="true" aria-live="polite">
      {/* 페이지 헤더 자리 */}
      <div className="border-b-2 border-ink/10 pb-5">
        <div className="h-2.5 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="mt-2.5 h-7 w-48 animate-pulse rounded bg-surface-muted md:h-8 md:w-60" />
        <div className="mt-2 h-3 w-full max-w-[420px] animate-pulse rounded bg-surface-muted/70" />
      </div>

      {/* KPI 6칸 — 실제 스트립과 동일 그리드 */}
      <section className="card mt-6 overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-surface-base px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="h-2.5 w-16 animate-pulse rounded bg-surface-muted" />
                <div className="h-3.5 w-3.5 animate-pulse rounded bg-surface-muted" />
              </div>
              <div className="mt-3 h-6 w-14 animate-pulse rounded bg-surface-muted md:h-5" />
              <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-surface-muted/70" />
              <div className="mt-1 h-2.5 w-2/3 animate-pulse rounded bg-surface-muted/50" />
            </div>
          ))}
        </div>
      </section>

      {/* 섹션 자리 2개 */}
      {[0, 1].map((i) => (
        <div key={i} className="mt-8">
          <div className="flex items-baseline gap-3 border-b border-border pb-3">
            <div className="h-3 w-5 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="card h-40 animate-pulse bg-surface-base md:h-56" />
            <div className="card h-40 animate-pulse bg-surface-base md:h-56" />
          </div>
        </div>
      ))}

      <span className="sr-only">불러오는 중…</span>
    </div>
  );
}
