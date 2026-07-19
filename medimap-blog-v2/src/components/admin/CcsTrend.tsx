/**
 * CcsTrend — 일자별 CCS(콘텐츠 인용 점유율) 추이 라인.
 *
 * Round 143i — 스파이크 점(자사 인용 있는 날) 클릭 시 당일 인용 URL·키워드·엔진 상세 패널 표시.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, TrendingUp, X } from 'lucide-react';
import { scopeToLang, readScope, SCOPE_EVENT } from '@/components/admin/ScopeSelector';

interface Pt {
  day: string;
  total: number | string;
  self_cites: number | string;
  ccs_pct: number | string;
}

interface T1Citation {
  url: string;
  domain: string;
  keyword: string;
  engine: string;
  time: string;
  count: number;
}

interface DayDetail {
  date: string;
  t1_citations: T1Citation[];
  t1_count: number;
  market_count: number;
  ccs_pct: number;
}

const SCOPE_LABEL: Record<string, string> = {
  all: '통합', ko: '🇰🇷 국내', en: 'EN', ja: 'JA', zh: 'ZH',
};

const ENGINE_COLOR: Record<string, string> = {
  gemini: '#4285F4', openai: '#10a37f', claude: '#D97706', perplexity: '#8B5CF6',
};

export function CcsTrend({ days = 30 }: { days?: number }) {
  const [scope, setScope] = useState('all');
  const [pts, setPts] = useState<Pt[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setScope(readScope());
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') setScope(detail);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);

  useEffect(() => {
    let alive = true;
    setPts(null);
    setErr(null);
    const langParam = scopeToLang(scope);
    const qs = `days=${days}${langParam ? `&lang=${encodeURIComponent(langParam)}` : ''}`;
    fetch(`/api/admin/ccs-trend?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.ok) throw new Error(j.error || '불러오기 실패');
        setPts(j.points ?? []);
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : '오류'));
    return () => { alive = false; };
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
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#15B8A6]/40 bg-[#15B8A6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#15B8A6]">
            ● 클릭하면 인용 증거 확인
          </span>
          <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] font-bold text-ink-soft">
            스코프: {SCOPE_LABEL[scope] ?? scope}
          </span>
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const data = pts.map((p) => ({
    day: p.day,
    total: Number(p.total) || 0,
    self: Number(p.self_cites) || 0,
    ccs: Number(p.ccs_pct) || 0,
  }));

  const selfSum = data.reduce((s, d) => s + d.self, 0);
  const marketSum = data.reduce((s, d) => s + d.total, 0);
  const overallCcs = marketSum > 0 ? (selfSum / marketSum) * 100 : 0;

  const handleDotClick = async (day: string, hasSelf: boolean) => {
    if (!hasSelf) return;
    if (selectedDate === day) {
      setSelectedDate(null);
      setDetail(null);
      return;
    }
    setSelectedDate(day);
    setDetail(null);
    setDetailLoading(true);
    try {
      const langParam = scopeToLang(scope);
      const qs = `date=${day}${langParam ? `&lang=${encodeURIComponent(langParam)}` : ''}`;
      const res = await fetch(`/api/admin/ccs-detail?${qs}`);
      const j = await res.json();
      if (j.ok) setDetail(j);
    } finally {
      setDetailLoading(false);
    }
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

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
      {/* 집계 헤더 */}
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
          시장 인용은 활발하지만 자사 점유는 바닥 —{' '}
          <strong className="text-ink">이 라인을 끌어올리는 것</strong>이 목표.
          회색 막대 = 그날 시장 전체 인용량.
        </div>
      </div>

      {/* SVG 차트 */}
      <div className="px-3 pb-1 pt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="CCS 추이">
          {/* 축 */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="currentColor" className="text-border" strokeWidth="1" />
          <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="currentColor" className="text-border" strokeWidth="1" />
          <text x={padL - 5} y={padT + 4} textAnchor="end" className="fill-ink-faint" fontSize="9">{maxCcs.toFixed(1)}%</text>
          <text x={padL - 5} y={padT + plotH} textAnchor="end" className="fill-ink-faint" fontSize="9">0%</text>

          {/* 날짜 레이블 */}
          <text x={padL} y={H - 6} textAnchor="start" className="fill-ink-faint" fontSize="9">{first.slice(5)}</text>
          <text x={W - padR} y={H - 6} textAnchor="end" className="fill-ink-faint" fontSize="9">{last.slice(5)}</text>

          {/* 시장 볼륨 바 */}
          {data.map((d, i) => (
            <rect
              key={`b${i}`}
              x={x(i) - barW / 2}
              y={padT + plotH - yBar(d.total)}
              width={barW}
              height={yBar(d.total)}
              className={selectedDate === d.day ? 'fill-accent-deep/30' : 'fill-ink-faint/25'}
            />
          ))}

          {/* CCS 라인 */}
          <polyline points={line} fill="none" className="stroke-accent-deep" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* 선택된 날짜 수직 강조선 */}
          {selectedDate && data.map((d, i) =>
            d.day === selectedDate ? (
              <line
                key="sel"
                x1={x(i)} y1={padT}
                x2={x(i)} y2={padT + plotH}
                stroke="#15B8A6"
                strokeWidth="1"
                strokeDasharray="3,2"
                opacity={0.6}
              />
            ) : null
          )}

          {/* 데이터 포인트 */}
          {data.map((d, i) => {
            const hasSpike = d.self > 0;
            const isSelected = selectedDate === d.day;
            return (
              <g key={`p${i}`}>
                {/* 클릭 히트 영역 (보이지 않는 넓은 원) */}
                {hasSpike && (
                  <circle
                    cx={x(i)}
                    cy={yCcs(d.ccs)}
                    r={14}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => void handleDotClick(d.day, hasSpike)}
                  />
                )}
                {/* 실제 표시 점 */}
                <circle
                  cx={x(i)}
                  cy={yCcs(d.ccs)}
                  r={hasSpike ? (isSelected ? 5 : 3.5) : 1.5}
                  className={
                    isSelected
                      ? 'fill-white stroke-[#15B8A6]'
                      : hasSpike
                      ? 'fill-accent-deep'
                      : 'fill-ink-faint'
                  }
                  strokeWidth={isSelected ? 2 : 0}
                  style={{ cursor: hasSpike ? 'pointer' : 'default', transition: 'r 0.15s' }}
                  onClick={() => void handleDotClick(d.day, hasSpike)}
                >
                  <title>
                    {hasSpike
                      ? `${d.day} — CCS ${d.ccs.toFixed(2)}% · 자사 ${d.self}회 / 시장 ${d.total}회 · 클릭해서 인용 증거 확인`
                      : `${d.day} — CCS ${d.ccs.toFixed(2)}% · 시장 ${d.total}회`}
                  </title>
                </circle>

                {/* 스파이크 날짜 레이블 */}
                {hasSpike && (
                  <text
                    x={x(i)}
                    y={yCcs(d.ccs) - 7}
                    textAnchor="middle"
                    fontSize="8"
                    className="fill-accent-deep font-semibold"
                  >
                    {d.day.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 인용 증거 상세 패널 */}
      {(selectedDate || detailLoading) && (
        <div ref={detailRef} className="mx-3 mb-3 overflow-hidden rounded-lg border border-[#15B8A6]/30 bg-[#15B8A6]/5">
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between border-b border-[#15B8A6]/20 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#15B8A6]" />
              <span className="text-[12px] font-semibold text-ink">
                {selectedDate} 인용 증거
              </span>
              {detail && (
                <span className="rounded-full bg-[#15B8A6]/15 px-2 py-0.5 text-[10px] font-bold text-[#15B8A6]">
                  CCS {detail.ccs_pct.toFixed(2)}% ({detail.t1_count} / {detail.market_count.toLocaleString()})
                </span>
              )}
            </div>
            <button
              onClick={() => { setSelectedDate(null); setDetail(null); }}
              className="rounded p-1 text-ink-muted hover:bg-surface-soft hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 패널 바디 */}
          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 인용 데이터 로딩 중…
            </div>
          ) : detail && detail.t1_citations.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] text-ink-muted">
              해당 날짜의 자사 인용 URL 데이터가 없습니다.
            </div>
          ) : detail ? (
            <div className="divide-y divide-border/40">
              {detail.t1_citations.map((c, i) => (
                <div key={i} className="px-4 py-3">
                  {/* URL 행 */}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-1.5 text-[12px] font-medium text-[#4F5DF8] hover:underline"
                  >
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                    <span className="break-all">{c.url.replace(/^https?:\/\//, '')}</span>
                  </a>

                  {/* 메타 태그 행 */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {/* 인용 횟수 */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#15B8A6]/15 px-2 py-0.5 text-[10px] font-bold text-[#15B8A6]">
                      ×{c.count} 인용
                    </span>
                    {/* 키워드 */}
                    <span className="rounded bg-surface-soft px-1.5 py-0.5 text-[10px] text-ink-soft">
                      🔍 {c.keyword}
                    </span>
                    {/* 엔진 */}
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize"
                      style={{
                        backgroundColor: `${ENGINE_COLOR[c.engine.toLowerCase()] ?? '#6B7280'}20`,
                        color: ENGINE_COLOR[c.engine.toLowerCase()] ?? '#6B7280',
                      }}
                    >
                      {c.engine}
                    </span>
                    {/* 시간 */}
                    <span className="text-[10px] text-ink-faint">{c.time} KST</span>
                  </div>
                </div>
              ))}

              {/* 하단 요약 */}
              <div className="bg-surface-soft/50 px-4 py-2.5 text-[11px] text-ink-muted">
                이 콘텐츠가 AI 의 출처로 선택됨 — 자동 학습 루프가 동일 구조를 다음 발행에 강화 적용합니다.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
