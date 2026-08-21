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

  /*
   * Round 169 (2026-08-20) — 모바일: 고정 viewBox(680×150) 폐기.
   *
   * 기존엔 viewBox 680 을 360px 화면에 width:100% 로 눌러 담아 스케일이 0.53배가 됐다.
   *   · fontSize 9 → 실제 4.8px (판독 불가)
   *   · 클릭 히트 원 r=14(지름 28) → 실제 15px (애플 HIG 44px 의 1/3)
   * 이제 ResizeObserver 로 컨테이너 실폭을 읽어 W = 그 값으로 둔다.
   *   → SVG 1 단위 = 1 CSS 픽셀(스케일 1.0). fontSize/r 을 CSS 픽셀로 직접 통제.
   */
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = (w: number) => {
      if (w > 0) setCw((prev) => (Math.abs(prev - w) < 1 ? prev : Math.round(w)));
    };
    measure(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => measure(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = pts.map((p) => ({
    day: p.day,
    total: Number(p.total) || 0,
    self: Number(p.self_cites) || 0,
    ccs: Number(p.ccs_pct) || 0,
  }));

  const selfSum = data.reduce((s, d) => s + d.self, 0);
  const marketSum = data.reduce((s, d) => s + d.total, 0);
  const overallCcs = marketSum > 0 ? (selfSum / marketSum) * 100 : 0;

  // Round 169 — 모든 점을 탭하면 값 배지가 뜨도록(SVG <title> 툴팁 제거 보완).
  //   인용 증거 상세 fetch 는 기존대로 자사 인용이 있는 날(스파이크)에서만.
  const handleDotClick = async (day: string, hasSelf: boolean) => {
    if (selectedDate === day) {
      setSelectedDate(null);
      setDetail(null);
      return;
    }
    setSelectedDate(day);
    setDetail(null);
    if (!hasSelf) return;
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

  /*
   * Round 169 — 치수는 실측 폭(cw) 기준. 스케일 1.0 이므로 아래 숫자는 전부 CSS 픽셀.
   *   · 모바일(≤640): H 190 — 세로를 늘려 라인의 기울기를 읽을 수 있게
   *   · 데스크톱: 기존 150 유지
   */
  const isNarrow = cw > 0 && cw < 640;
  const W = cw || 680;
  const H = isNarrow ? 190 : 150;
  const AXIS_FS = 11;   // 최소 11px — 그 아래는 모바일에서 판독 불가
  const DATE_FS = 11;
  const padL = 40;      // "12.3%" 를 11px 로 담을 폭
  const padR = 14;
  const padT = isNarrow ? 16 : 12;
  const padB = isNarrow ? 26 : 22;
  const plotW = Math.max(40, W - padL - padR);
  const plotH = Math.max(40, H - padT - padB);
  const n = data.length;
  const maxCcs = Math.max(0.5, ...data.map((d) => d.ccs));
  const maxTot = Math.max(1, ...data.map((d) => d.total));

  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yCcs = (v: number) => padT + plotH - (v / maxCcs) * plotH;
  const yBar = (v: number) => (v / maxTot) * plotH;
  const line = data.map((d, i) => `${x(i)},${yCcs(d.ccs)}`).join(' ');
  const barW = Math.max(1.5, (plotW / n) * 0.5);
  const bandW = plotW / Math.max(1, n);
  const first = data[0]?.day ?? '';
  const last = data[n - 1]?.day ?? '';
  const selected = selectedDate ? data.find((d) => d.day === selectedDate) ?? null : null;

  return (
    <div>
      {/* 집계 헤더 */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 pt-4 md:px-5">
        <div>
          <div className="text-2xl font-black tabular-nums tracking-tight text-ink">
            {overallCcs.toFixed(2)}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            기간 CCS (자사 {selfSum.toLocaleString()} / 시장 {marketSum.toLocaleString()})
          </div>
        </div>
        <div className="break-keep text-[11px] leading-relaxed text-ink-muted">
          시장 인용은 활발하지만 자사 점유는 바닥 —{' '}
          <strong className="text-ink">이 라인을 끌어올리는 것</strong>이 목표.
          회색 막대 = 그날 시장 전체 인용량.
        </div>
      </div>

      {/* SVG 차트 — 컨테이너 실폭 = viewBox 폭 (스케일 1.0) */}
      <div ref={wrapRef} className="px-2 pb-1 pt-2 md:px-3">
        {cw === 0 ? (
          <div style={{ height: H }} />
        ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block h-auto w-full touch-manipulation"
          role="img"
          aria-label="CCS 추이"
        >
          {/* 축 */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="currentColor" className="text-border" strokeWidth="1" />
          <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="currentColor" className="text-border" strokeWidth="1" />
          <text x={padL - 6} y={padT + 4} textAnchor="end" className="fill-ink-muted" fontSize={AXIS_FS}>{maxCcs.toFixed(1)}%</text>
          <text x={padL - 6} y={padT + plotH} textAnchor="end" className="fill-ink-muted" fontSize={AXIS_FS}>0%</text>

          {/* 날짜 레이블 */}
          <text x={padL} y={H - 6} textAnchor="start" className="fill-ink-muted" fontSize={DATE_FS}>{first.slice(5)}</text>
          <text x={W - padR} y={H - 6} textAnchor="end" className="fill-ink-muted" fontSize={DATE_FS}>{last.slice(5)}</text>

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

          {/*
            Round 169 — 터치 타겟.
              ① 모든 점: 플롯 전 높이의 투명 밴드(가로 = 한 점 몫의 폭) → 어디를 눌러도 그날이 잡힌다.
              ② 스파이크 점: 그 위에 r=22(지름 44px) 투명 원 → HIG 최소 터치 크기 충족.
            겹침 순서상 ②가 위에 있어 중요한 점이 우선 잡힌다.
          */}
          {data.map((d, i) => (
            <rect
              key={`h${i}`}
              x={x(i) - bandW / 2}
              y={padT}
              width={Math.max(bandW, 6)}
              height={plotH}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => void handleDotClick(d.day, d.self > 0)}
            />
          ))}

          {/* 데이터 포인트 */}
          {data.map((d, i) => {
            const hasSpike = d.self > 0;
            const isSelected = selectedDate === d.day;
            return (
              <g key={`p${i}`}>
                {hasSpike && (
                  <circle
                    cx={x(i)}
                    cy={yCcs(d.ccs)}
                    r={22}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => void handleDotClick(d.day, hasSpike)}
                  />
                )}
                {/* 실제 표시 점 — 모바일은 조금 크게 */}
                <circle
                  cx={x(i)}
                  cy={yCcs(d.ccs)}
                  r={hasSpike ? (isSelected ? (isNarrow ? 6 : 5) : isNarrow ? 4.5 : 3.5) : isNarrow ? 2 : 1.5}
                  className={
                    isSelected
                      ? 'fill-white stroke-[#15B8A6]'
                      : hasSpike
                      ? 'fill-accent-deep'
                      : 'fill-ink-faint'
                  }
                  strokeWidth={isSelected ? 2 : 0}
                  style={{ pointerEvents: 'none', transition: 'r 0.15s' }}
                />

                {/* 스파이크 날짜 레이블 — 좁은 화면에선 겹쳐서 생략(대신 아래 값 배지) */}
                {hasSpike && !isNarrow && (
                  <text
                    x={x(i)}
                    y={yCcs(d.ccs) - 9}
                    textAnchor="middle"
                    fontSize={11}
                    className="fill-accent-deep font-semibold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {d.day.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        )}
      </div>

      {/*
        Round 169 — SVG <title> 툴팁 제거 대체물.
        <title> 은 hover 로만 뜨므로 터치 기기에선 값을 볼 방법이 아예 없었다.
        점을 탭하면 차트 바로 아래에 그날 값 배지가 뜬다(선택 상태 = selectedDate 재사용).
      */}
      <div className="px-4 pb-3 md:px-5">
        {selected ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
            <span className="text-[12px] font-bold tabular-nums text-ink">{selected.day}</span>
            <span className="rounded-full bg-accent-deep/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-accent-deep">
              CCS {selected.ccs.toFixed(2)}%
            </span>
            <span className="text-[11px] tabular-nums text-ink-muted">
              자사 {selected.self}회 · 시장 {selected.total.toLocaleString()}회
            </span>
            {selected.self > 0 ? (
              <span className="text-[11px] font-semibold text-[#15B8A6]">↓ 인용 증거</span>
            ) : (
              <span className="text-[11px] text-ink-faint">이 날 자사 인용 없음</span>
            )}
            <button
              type="button"
              onClick={() => { setSelectedDate(null); setDetail(null); }}
              aria-label="선택 해제"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-ink-muted active:bg-surface-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-ink-muted">
            그래프의 점을 탭하면 그날의 CCS·인용 수가 여기에 표시됩니다.
          </div>
        )}
      </div>

      {/* 인용 증거 상세 패널 */}
      {(detailLoading || detail) && (
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
