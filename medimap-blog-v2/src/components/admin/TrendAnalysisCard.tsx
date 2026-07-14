/**
 * Round 65~67 (2026-06-22) — 추이 분석 카드.
 *
 * 탭 2개:
 *   - 경쟁사 점유 현황 : 위서클(굵은 파랑) + 선택 클라이언트(민트) + 경쟁사 도메인 top6 (전체 엔진)
 *   - AI 엔진별 인용   : 위와 동일 구성 + 엔진 드롭다운으로 한 엔진만 필터
 */
'use client';

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExternalLink, Loader2, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { readScope, SCOPE_EVENT } from '@/components/admin/ScopeSelector';

type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'NOISE';
interface CiteItem {
  tier: Tier;
  label: string;
  domain: string;
  url: string | null;
  engine: string;
  keyword: string;
}
interface DayDetail {
  date: string;
  ours: CiteItem[];
  competitors: CiteItem[];
  totals: { ours: number; competitors: number };
}

type Dim = { series: string[]; data: Array<Record<string, number | string>> };
type TrendData = {
  keywords: string[];
  engines: string[];
  dates: string[];
  series: Dim;
  summary: {
    medimap_total: number;
    client_total: number;
    competitor_total: number;
    top_engine: string | null;
    top_competitor: string | null;
    client_label: string;
  };
};

type Mode = 'competitor' | 'engine';
const MODE_LABEL: Record<Mode, string> = {
  competitor: '경쟁사 점유 현황',
  engine: 'AI 엔진별 인용',
};

// Round 124-E — 경쟁 도메인 라인: 원색 혼재(빨강/핑크/스카이) 제거 → 바이올렛·골드·slate
// 계열 조화 (구분용 뮤트 로즈 1색만 허용)
const PALETTE = ['#818CF8', '#E8A33D', '#7C3AED', '#64748B', '#E0708A', '#A5B4FC'];
const ENGINE_LABELS: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  openai: 'ChatGPT',
};

// Round 86 (2026-06-28) — 엔진별 색상 일관성: Gemini=blue / Claude=orange / ChatGPT=green
const ENGINE_COLOR: Record<string, string> = {
  Gemini: '#1B68FF',   // 위서클 brand blue
  Claude: '#F97316',   // orange (Anthropic 아이덴티티)
  ChatGPT: '#10A37F',  // green (OpenAI 아이덴티티)
};

function lineStyleFor(name: string, i: number, clientLabel: string): { stroke: string; strokeWidth: number } {
  // Round 86 — multi-engine breakdown ("위서클 · Gemini" 같은 라벨) 색상.
  //   같은 엔진 = 같은 색. 위서클/클라이언트/경쟁사는 굵기로 구분.
  const dotIdx = name.indexOf(' · ');
  if (dotIdx > 0) {
    const subject = name.slice(0, dotIdx);
    const engineName = name.slice(dotIdx + 3);
    const stroke = ENGINE_COLOR[engineName] ?? PALETTE[i % PALETTE.length];
    if (subject === '위서클') return { stroke, strokeWidth: 3 };
    if (subject.includes('경쟁사')) return { stroke, strokeWidth: 1.5 };
    return { stroke, strokeWidth: 2.25 };  // 클라이언트
  }
  // 기존 (single engine 모드)
  if (name === '위서클 인용 현황') return { stroke: '#0F766E', strokeWidth: 3 };
  if (name === clientLabel) return { stroke: '#15B8A6', strokeWidth: 2.5 };
  return { stroke: PALETTE[i % PALETTE.length], strokeWidth: 2 };
}

export function TrendAnalysisCard({ tenantId, days = 30 }: { tenantId: number | null; days?: number }) {
  const [keyword, setKeyword] = useState<string>('');
  const [mode, setMode] = useState<Mode>('competitor');
  const [engine, setEngine] = useState<string>(''); // engine 모드에서만 사용 ('' = 전체)
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  // Round 143 — 언어 스코프 (헤더 ScopeSelector 동기화)
  const [scope, setScope] = useState('all');
  // Round 143 — 일별 인용 드릴다운
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setScope(readScope());
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (typeof d === 'string') setScope(d);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', String(tenantId));
    if (keyword) params.set('keyword', keyword);
    if (scope && scope !== 'all') params.set('scope', scope);
    // Round 86 — engine='__compare__' 면 multi-engine breakdown 모드
    if (mode === 'engine') {
      if (engine === '__compare__') {
        params.set('breakdown', 'engine');
      } else if (engine) {
        params.set('engine', engine);
      }
    }
    params.set('days', String(days));
    fetch(`/api/admin/competitors/trends${params.toString() ? '?' + params.toString() : ''}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) => {
        if (alive && j.ok) setData(j as TrendData);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantId, keyword, mode, engine, days, scope]);

  // 스코프/기간/키워드 바뀌면 열린 드릴다운 닫기 (stale 방지)
  useEffect(() => {
    setDetailDate(null);
    setDetail(null);
  }, [tenantId, scope, days, keyword, engine, mode]);

  const openDayDetail = (label: string) => {
    if (!label) return;
    setDetailDate(label);
    setDetailLoading(true);
    setDetail(null);
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', String(tenantId));
    if (keyword) params.set('keyword', keyword);
    if (scope && scope !== 'all') params.set('scope', scope);
    if (mode === 'engine' && engine && engine !== '__compare__') params.set('engine', engine);
    params.set('days', String(days));
    params.set('date', label);
    fetch(`/api/admin/competitors/trends/detail?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setDetail(j as DayDetail);
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  };

  const clientLabel = data?.summary.client_label ?? '클라이언트';
  const dim = data?.series ?? null;
  const hasData =
    !!data &&
    (data.summary.medimap_total + data.summary.client_total + data.summary.competitor_total > 0) &&
    !!dim &&
    dim.series.length > 0;

  return (
    <section className="mb-6 card card-pad print:hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-ink-soft" />
          <h2 className="section-title">추이 분석</h2>
          <span className="text-[10px] text-ink-muted">최근 {days}일 · AI 인용 흐름</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="rounded-lg border border-border bg-surface-base px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
          >
            <option value="">전체 키워드</option>
            {(data?.keywords ?? []).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {/* AI 엔진별 모드일 때만 엔진 드롭다운.
              Round 86 (2026-06-28) — '엔진별 비교' 옵션 추가: 한 차트에 3엔진 동시 표시. */}
          {mode === 'engine' && (
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface-muted/60 px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            >
              <option value="__compare__">엔진별 비교 (3엔진 동시)</option>
              <option value="">전체 엔진 (합산)</option>
              {(data?.engines ?? []).map((e) => (
                <option key={e} value={e}>
                  {ENGINE_LABELS[e] ?? e}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-border bg-surface-base p-0.5">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold transition',
                  mode === m ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-subtle'
                )}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 요약 스탯 */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-surface-muted/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink">위서클 인용 ⭐</div>
          <div className="text-lg font-bold text-ink-soft">{data?.summary.medimap_total ?? 0}</div>
        </div>
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#15B8A615' }}>
          <div className="truncate text-[10px] uppercase tracking-wider" style={{ color: '#0F766E' }} title={clientLabel}>
            {clientLabel}
          </div>
          <div className="text-lg font-bold text-accent">{data?.summary.client_total ?? 0}</div>
        </div>
        <div className="rounded-lg bg-surface-subtle px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">경쟁사 인용</div>
          <div className="text-lg font-bold text-ink">{data?.summary.competitor_total ?? 0}</div>
        </div>
        <div className="rounded-lg bg-surface-subtle px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">최다 경쟁사</div>
          <div className="truncate font-mono text-sm font-bold text-ink" title={data?.summary.top_competitor ?? ''}>
            {data?.summary.top_competitor ?? '—'}
          </div>
        </div>
      </div>

      {/* 차트 */}
      {loading ? (
        <div className="flex h-56 items-center justify-center text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
        </div>
      ) : !hasData ? (
        <div className="flex h-56 flex-col items-center justify-center text-sm text-ink-muted">
          <div>아직 추이 데이터가 부족합니다</div>
          <div className="mt-1 text-[11px] text-ink-faint">
            production 측정이 누적되면 채워집니다 (매일 KST 07:00 자동 cron)
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={dim!.data}
            margin={{ top: 4, right: 16, bottom: 0, left: -8 }}
            onClick={(e: { activeLabel?: string | number } | null) => {
              const lbl = e?.activeLabel;
              if (typeof lbl === 'string') openDayDetail(lbl);
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
            <XAxis dataKey="date" fontSize={10} stroke="#64748B" interval="preserveStartEnd" minTickGap={24} />
            <YAxis fontSize={10} stroke="#64748B" allowDecimals={false} width={32} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5EBED' }}
              labelStyle={{ fontSize: 11, fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {dim!.series.map((name, i) => {
              const st = lineStyleFor(name, i, clientLabel);
              return (
                <Line
                  key={`v${i}`}
                  type="monotone"
                  dataKey={`v${i}`}
                  name={name}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}

      {hasData && !detailDate && (
        <div className="mt-2 text-center text-[10px] text-ink-muted">
          💡 차트의 날짜(점)를 클릭하면 그날 인용된 콘텐츠·URL 을 볼 수 있습니다
        </div>
      )}

      {/* Round 143 — 일별 인용 드릴다운 패널 */}
      {detailDate && (
        <div className="mt-4 rounded-xl border border-border bg-surface-muted/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-ink">
              {detail?.date ?? detailDate} · 인용된 콘텐츠
              {detail && (
                <span className="ml-2 text-[11px] font-normal text-ink-muted">
                  자사·클라이언트 {detail.totals.ours} · 경쟁사 {detail.totals.competitors}
                </span>
              )}
            </div>
            <button
              onClick={() => { setDetailDate(null); setDetail(null); }}
              className="text-ink-muted hover:text-ink"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center gap-2 py-6 text-[12px] text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
            </div>
          ) : !detail || (detail.ours.length === 0 && detail.competitors.length === 0) ? (
            <div className="py-6 text-center text-[12px] text-ink-muted">이 날짜에 인용 출처 데이터가 없습니다.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-status-success">
                  우리 편 ({detail.ours.length})
                </div>
                {detail.ours.length === 0 ? (
                  <div className="text-[11px] text-ink-muted">없음</div>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.ours.map((c, i) => (
                      <li key={`o${i}`} className="text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-status-successSoft px-1 py-0.5 text-[9px] font-bold text-status-success">
                            {c.label}
                          </span>
                          <span className="text-ink-muted">{c.engine}</span>
                          {c.keyword && <span className="truncate text-ink-muted">· {c.keyword}</span>}
                        </div>
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer"
                            className="mt-0.5 flex items-center gap-1 break-all font-mono text-[10px] text-brand hover:underline">
                            <ExternalLink className="h-3 w-3 shrink-0" /> {c.url}
                          </a>
                        ) : (
                          <span className="font-mono text-[10px] text-ink-soft">{c.domain}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  경쟁사 ({detail.competitors.length})
                </div>
                {detail.competitors.length === 0 ? (
                  <div className="text-[11px] text-ink-muted">없음</div>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.competitors.map((c, i) => (
                      <li key={`c${i}`} className="text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-surface-subtle px-1 py-0.5 text-[9px] font-bold text-ink-soft">
                            {c.tier}
                          </span>
                          <span className="text-ink-muted">{c.engine}</span>
                          {c.keyword && <span className="truncate text-ink-muted">· {c.keyword}</span>}
                        </div>
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noopener noreferrer"
                            className="mt-0.5 flex items-center gap-1 break-all font-mono text-[10px] text-ink hover:underline">
                            <ExternalLink className="h-3 w-3 shrink-0" /> {c.url}
                          </a>
                        ) : (
                          <span className="font-mono text-[10px] text-ink-soft">{c.domain}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
