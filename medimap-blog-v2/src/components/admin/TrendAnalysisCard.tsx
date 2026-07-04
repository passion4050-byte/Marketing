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
import { Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

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

const PALETTE = ['#A855F7', '#F59E0B', '#EF4444', '#64748B', '#0EA5E9', '#EC4899'];
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
  if (name === '위서클 인용 현황') return { stroke: '#1B68FF', strokeWidth: 3 };
  if (name === clientLabel) return { stroke: '#15B8A6', strokeWidth: 2.5 };
  return { stroke: PALETTE[i % PALETTE.length], strokeWidth: 2 };
}

export function TrendAnalysisCard({ tenantId, days = 30 }: { tenantId: number | null; days?: number }) {
  const [keyword, setKeyword] = useState<string>('');
  const [mode, setMode] = useState<Mode>('competitor');
  const [engine, setEngine] = useState<string>(''); // engine 모드에서만 사용 ('' = 전체)
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', String(tenantId));
    if (keyword) params.set('keyword', keyword);
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
  }, [tenantId, keyword, mode, engine, days]);

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
          <LineChart data={dim!.data} margin={{ top: 4, right: 16, bottom: 0, left: -8 }}>
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
    </section>
  );
}
