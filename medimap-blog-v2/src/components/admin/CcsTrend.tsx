/**
 * CcsTrend — 일자별 CCS(콘텐츠 인용 점유율) 추이 라인 + 언어 스코프 토글.
 *
 * 북극성 지표: AI 인용 시장에서 우리(wecircle) 콘텐츠의 점유율 추세.
 * 언어 토글(통합/국내KO/EN/JA/ZH)로 상품 언어별 데이터만 필터 — 예: EN 상품 병원은 EN 데이터만.
 * /api/admin/ccs-trend?days=&lang= 에서 RPC(citation_market_trend) 결과 fetch → 경량 SVG(무외부의존).
 */
'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

interface Pt {
  day: string;
  total: number | string;
  self_cites: number | string;
  ccs_pct: number | string;
}

const SCOPES = [
  { key: 'all', label: '통합', lang: '' },
  { key: 'ko', label: '🇰🇷 국내', lang: 'ko' },
  { key: 'en', label: 'EN', lang: 'en' },
  { key: 'ja', label: 'JA', lang: 'ja' },
  { key: 'zh', label: 'ZH', lang: 'zh-Hant' },
] as const;

export function CcsTrend({ days = 30 }: { days?: number }) {
  const [scope, setScope] = useState<string>('all');
  const [pts, setPts] = useState<Pt[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPts(null);
    setErr(null);
    const langParam = SCOPES.find((s) => s.key === scope)?.lang ?? '';
    const qs = `days=${days}${langParam ? `&lang=${encodeURIComponent(langParam)}` : ''}`;
    fetch(`/api/admin/ccs-trend?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.ok) throw new Error(j.error || '불러오기 실패');
        setPts(j.points ?? []);
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : '오류'));
    return () => {
      alive = false;
    };
  }, [days, scope]);

  return (
    <section className="card mt-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <TrendingUp className="h-4 w-4 text-ink-soft" />
            우리 콘텐츠 인용 점유율(CCS) 추이 — {days}일
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            AI 인용 시장에서 wecircle 콘텐츠가 차지하는 일자별 점유율 (북극성 지표)
          </div>
        </div>
        {/* 언어 스코프 토글 — 상품 언어별 데이터만 */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-subtle p-0.5">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={
                scope === s.key
                  ? 'rounded-md bg-accent-deep px-2.5 py-1 text-[11px] font-bold text-white'
                  : 'rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:text-ink'
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {err ? (
        <div className="px-5 py-8 text-center text-xs text-status-danger">불러오기 실패: {err}</div>
      ) : !pts ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-[12px] text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 추이 로딩 중…
        </div>
      ) : (
        <Chart pts={pts} scope={scope} />
      )}
    </section>
  );
}

function Chart({ pts, scope }: { pts: Pt[]; scope: string }) {
  const data = pts.map((p) => ({
    day: p.day,
    total: Number(p.total) || 0,
    self: Number(p.self_cites) || 0,
    ccs: Number(p.ccs_pct) || 0,
  }));

  const selfSum = data.reduce((s, d) => s + d.self, 0);
  const marketSum = data.reduce((s, d) => s + d.total, 0);
  const overallCcs = marketSum > 0 ? (selfSum / marketSum) * 100 : 0;

  if (data.length === 0) {
    const overseas = scope !== 'all' && scope !== 'ko';
    return (
      <div className="px-5 py-10 text-center text-xs text-ink-muted">
        {overseas
          ? '해당 언어 측정 데이터가 아직 없습니다 — 해외 측정 파이프라인(Phase B) 가동 후 표시됩니다.'
          : '측정 데이터가 아직 없습니다. 다음 측정 cron 이후 표시됩니다.'}
      </div>
    );
  }

  const W = 680;
  const H = 150;
  const padL = 34;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const n = data.length;
  const maxCcs = Math.max(0.5, ...data.map((d) => d.ccs));
  const maxTot = Math.max(1, ...data.map((d) => d.total));

  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yCcs = (v: number) => padT + plotH - (v / maxCcs) * plotH;
  const yBar = (v: number) => (v / maxTot) * plotH;

  const line = data.map((d, i) => `${x(i)},${yCcs(d.ccs)}`).join(' ');
  const barW = Math.max(1.5, (plotW / n) * 0.5);

  const first = data[0]?.day ?? '';
  const last = data[n - 1]?.day ?? '';

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-5 pt-4">
        <div>
          <div className="text-2xl font-black tabular-nums tracking-tight text-ink">
            {overallCcs.toFixed(2)}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            기간 CCS (자사 {selfSum.toLocaleString()} / 시장 {marketSum.toLocaleString()})
          </div>
        </div>
        <div className="text-[11px] leading-relaxed text-ink-muted">
          시장 인용은 활발하지만 자사 점유는 바닥 — <strong className="text-ink">이 라인을 끌어올리는 것</strong>이 목표.
          회색 막대 = 그날 시장 전체 인용량.
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="CCS 추이">
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="currentColor" className="text-border" strokeWidth="1" />
          <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="currentColor" className="text-border" strokeWidth="1" />
          <text x={padL - 5} y={padT + 4} textAnchor="end" className="fill-ink-faint" fontSize="9">
            {maxCcs.toFixed(1)}%
          </text>
          <text x={padL - 5} y={padT + plotH} textAnchor="end" className="fill-ink-faint" fontSize="9">
            0%
          </text>

          {data.map((d, i) => (
            <rect
              key={`b${i}`}
              x={x(i) - barW / 2}
              y={padT + plotH - yBar(d.total)}
              width={barW}
              height={yBar(d.total)}
              className="fill-ink-faint/25"
            />
          ))}

          <polyline points={line} fill="none" className="stroke-accent-deep" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {data.map((d, i) => (
            <circle
              key={`p${i}`}
              cx={x(i)}
              cy={yCcs(d.ccs)}
              r={d.self > 0 ? 3 : 1.5}
              className={d.self > 0 ? 'fill-accent-deep' : 'fill-ink-faint'}
            >
              <title>{`${d.day} · CCS ${d.ccs.toFixed(2)}% (자사 ${d.self} / 시장 ${d.total})`}</title>
            </circle>
          ))}

          <text x={padL} y={H - 6} textAnchor="start" className="fill-ink-faint" fontSize="9">
            {first.slice(5)}
          </text>
          <text x={W - padR} y={H - 6} textAnchor="end" className="fill-ink-faint" fontSize="9">
            {last.slice(5)}
          </text>
        </svg>
      </div>
    </div>
  );
}
