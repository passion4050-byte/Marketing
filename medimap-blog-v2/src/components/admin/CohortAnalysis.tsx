/**
 * Round 144 (2026-08-02) — 발행일 코호트 분석 카드.
 *
 * 이 카드가 답하는 질문: "발행했는데 인용이 없다"가 실패인가, 아직 색인이 안 된 것인가?
 * 이걸 구분하지 못하면 잘못된 방향으로 프롬프트·구조를 고치게 된다.
 */
'use client';

import { useEffect, useState } from 'react';
import { CalendarRange, Loader2, Info } from 'lucide-react';
import { scopeToContentLang, readScope, SCOPE_EVENT } from '@/components/admin/ScopeSelector';

interface Bucket {
  key: string;
  label: string;
  articles: number;
  cited: number;
  pct: number;
  ciLow: number;
  ciHigh: number;
  mature: boolean;
}

interface CohortResp {
  ok: boolean;
  total: number;
  matureDays: number;
  buckets: Bucket[];
  summary: {
    mature: number;
    matureCited: number;
    maturePct: number;
    matureCi: [number, number];
    immature: number;
    immatureCited: number;
    immaturePct: number;
    immatureCi: [number, number];
    immatureShare: number;
    avgDaysToCite: number | null;
    ciOverlap: boolean;
    projection: { low: number; mid: number; high: number };
  };
  citedArticles: Array<{
    id: number;
    slug: string;
    title: string | null;
    published: string;
    firstCited: string;
    daysToCite: number | null;
  }>;
}

export function CohortAnalysis() {
  const [scope, setScope] = useState('all');
  const [d, setD] = useState<CohortResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setScope(readScope());
    const on = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (typeof v === 'string') setScope(v);
    };
    window.addEventListener(SCOPE_EVENT, on);
    return () => window.removeEventListener(SCOPE_EVENT, on);
  }, []);

  useEffect(() => {
    let alive = true;
    setD(null);
    setErr(null);
    const lang = scopeToContentLang(scope);
    fetch(`/api/admin/cohort${lang ? `?lang=${encodeURIComponent(lang)}` : ''}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.ok) throw new Error(j.error || '불러오기 실패');
        setD(j);
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : '오류'));
    return () => {
      alive = false;
    };
  }, [scope]);

  return (
    <section className="card mt-6">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <CalendarRange className="h-4 w-4 text-ink-soft" />
          발행일 코호트 — 실패인가, 아직 색인이 안 된 것인가
        </h2>
        <div className="mt-0.5 text-[11px] text-ink-muted">
          발행 후 경과 기간별로 실제 출처 인용된 글의 비율. 첫 인용까지 시간이 걸리므로,
          최근 글의 인용 0을 실패로 읽으면 잘못된 처방을 하게 됩니다.
        </div>
      </header>

      {err ? (
        <div className="px-5 py-8 text-center text-xs text-status-danger">불러오기 실패: {err}</div>
      ) : !d ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-[12px] text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 코호트 계산 중…
        </div>
      ) : d.total === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-ink-muted">
          해당 스코프에 발행 콘텐츠가 없습니다.
        </div>
      ) : (
        <Body d={d} />
      )}
    </section>
  );
}

function Body({ d }: { d: CohortResp }) {
  const s = d.summary;
  const maxPct = Math.max(1, ...d.buckets.map((b) => b.ciHigh));

  return (
    <div className="p-4 md:p-5">
      {/* 핵심 요약 */}
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          v={`${s.immatureShare}%`}
          l={`아직 ${d.matureDays}일 미만`}
          sub={`${s.immature}편 / 전체 ${d.total}편 — 평가 유보 대상`}
          tone="warn"
        />
        <SummaryCard
          v={`${s.maturePct}%`}
          l="성숙 코호트 인용률"
          sub={`${s.matureCited} / ${s.mature}편 · 95% CI ${s.matureCi[0]}~${s.matureCi[1]}%`}
          tone="ok"
        />
        <SummaryCard
          v={s.avgDaysToCite != null ? `${s.avgDaysToCite}일` : '—'}
          l="첫 인용까지 평균"
          sub={s.avgDaysToCite != null ? '발행 → 최초 출처 인용' : '인용 사례 없음'}
          tone="neutral"
        />
      </div>

      {/* 버킷 막대 */}
      <div className="mt-5 space-y-2">
        {d.buckets
          .filter((b) => b.articles > 0)
          .map((b) => (
            <div key={b.key} className="flex items-center gap-3">
              <div className="w-16 shrink-0 text-right text-[11px] font-semibold text-ink-soft">
                {b.label}
              </div>
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-surface-subtle">
                {/* 신뢰구간 (연한 영역) */}
                <div
                  className="absolute inset-y-0 bg-ink-faint/20"
                  style={{
                    left: `${(b.ciLow / maxPct) * 100}%`,
                    width: `${Math.max(0.5, ((b.ciHigh - b.ciLow) / maxPct) * 100)}%`,
                  }}
                  title={`95% 신뢰구간 ${b.ciLow}~${b.ciHigh}%`}
                />
                {/* 점추정 */}
                <div
                  className={b.mature ? 'absolute inset-y-0 w-[3px] bg-accent-deep' : 'absolute inset-y-0 w-[3px] bg-ink-faint'}
                  style={{ left: `${(b.pct / maxPct) * 100}%` }}
                />
                <div className="absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold text-ink-soft">
                  {b.cited} / {b.articles}편
                  <span className="ml-2 font-normal text-ink-muted">
                    {b.pct}% (CI {b.ciLow}~{b.ciHigh}%)
                  </span>
                </div>
              </div>
              {!b.mature && (
                <span className="shrink-0 rounded-full bg-status-warningSoft px-2 py-0.5 text-[10px] font-bold text-status-warning">
                  평가 유보
                </span>
              )}
            </div>
          ))}
      </div>

      {/* 판정 */}
      <div className="mt-5 rounded-lg border border-border bg-surface-subtle/50 p-4 text-[12px] leading-relaxed text-ink-soft">
        <div className="mb-1.5 flex items-center gap-1.5 font-bold text-ink">
          <Info className="h-3.5 w-3.5" /> 지금 내릴 수 있는 판정
        </div>
        {s.mature < 30 ? (
          <p className="mb-2">
            성숙 코호트가 <strong className="text-ink">{s.mature}편</strong>뿐이라 아직
            어떤 결론도 통계적으로 낼 수 없습니다. 전체의{' '}
            <strong className="text-ink">{s.immatureShare}%</strong>가 평가 유보 상태입니다 —
            지금 필요한 건 추가 발행이 아니라 <strong className="text-ink">기다림</strong>입니다.
          </p>
        ) : (
          <p className="mb-2">
            성숙 코호트 {s.mature}편 기준 인용률{' '}
            <strong className="text-ink">{s.maturePct}%</strong>. 표본이 충분해졌으므로 방향
            판단이 가능합니다.
          </p>
        )}
        <p className="mb-2">
          미성숙({s.immaturePct}%, CI {s.immatureCi[0]}~{s.immatureCi[1]}%) vs 성숙(
          {s.maturePct}%, CI {s.matureCi[0]}~{s.matureCi[1]}%) —{' '}
          {s.ciOverlap ? (
            <>
              신뢰구간이 <strong className="text-status-warning">겹칩니다</strong>. 색인 지연
              가설은 방향성만 지지될 뿐 통계적으로는 <strong className="text-ink">미확정</strong>입니다.
            </>
          ) : (
            <>
              신뢰구간이 <strong className="text-status-success">분리됩니다</strong>. 색인 경과
              시간이 인용에 유의미하게 작용한다고 볼 수 있습니다.
            </>
          )}
        </p>
        <p className="mb-0">
          현재 {d.total}편이 <strong className="text-ink">전부 성숙했을 때</strong> 1회 이상
          인용될 것으로 기대되는 글:{' '}
          <strong className="text-ink">
            {s.projection.low}편(보수) / {s.projection.mid}편(점추정) / {s.projection.high}편(낙관)
          </strong>
          . 이건 &ldquo;1회 이상&rdquo;이지 지속 인용이 아닙니다.
        </p>
      </div>

      {/* 인용된 글 목록 */}
      {d.citedArticles.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
            실제 인용된 글 ({d.citedArticles.length}편) — 발행 → 첫 인용
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-right">발행</th>
                  <th className="px-3 py-2 text-right">첫 인용</th>
                  <th className="px-3 py-2 text-right">소요</th>
                </tr>
              </thead>
              <tbody>
                {d.citedArticles.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="max-w-[320px] truncate px-3 py-2 text-ink" title={c.title ?? ''}>
                      {c.title ?? c.slug}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-ink-muted">
                      {c.published}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-ink-muted">
                      {c.firstCited}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] font-bold text-accent-deep">
                      {c.daysToCite}일
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-[10px] leading-relaxed text-ink-faint">
        ※ 슬러그 매칭은 <strong>자사(T1) 도메인으로 제한</strong>합니다. 해외 영문 슬러그가
        경쟁사 URL 과 동일한 경우가 있어(예: smile-lasik-in-korea), 제한하지 않으면 경쟁사
        인용이 우리 것으로 잡혀 인용률이 크게 부풀려집니다.
      </div>
    </div>
  );
}

function SummaryCard({
  v,
  l,
  sub,
  tone,
}: {
  v: string;
  l: string;
  sub: string;
  tone: 'warn' | 'ok' | 'neutral';
}) {
  const color =
    tone === 'warn' ? 'text-status-warning' : tone === 'ok' ? 'text-accent-deep' : 'text-ink';
  return (
    <div className="rounded-lg border border-border bg-surface-base p-3.5">
      <div className={`text-2xl font-black tabular-nums tracking-tight ${color}`}>{v}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{l}</div>
      <div className="mt-1 text-[11px] text-ink-soft">{sub}</div>
    </div>
  );
}
