'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

/**
 * Round 109-A (2026-07-03) — 파트너 병원별 30일 AI 인용 리더보드.
 * 사용자 요구: "파트너에게 우리 콘텐츠 덕에 AI 얼마나 노출됐어요" 실증 제공.
 */
interface Partner {
  tenant_id: number;
  tenant_name: string;
  domain_category: string | null;
  partner_slug: string | null;
  mentions_30d: number;
  mentions_7d: number;
  mentions_delta: number;
  published_contents: number;
  engines: Record<string, number>;
  last_mention: string | null;
}

interface Data {
  partners: Partner[];
  total_mentions_30d: number;
  total_mentions_7d: number;
}

const ENGINE_COLORS: Record<string, string> = {
  gemini: 'bg-blue-100 text-blue-700',
  claude: 'bg-purple-100 text-purple-700',
  openai: 'bg-accent-soft text-accent-deep',
  perplexity: 'bg-orange-100 text-orange-700',
  unknown: 'bg-slate-100 text-slate-700',
};

export function PartnerLeaderboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/partner-leaderboard')
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-base p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-hover" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-surface-hover/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.partners.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-base p-6 text-center text-sm text-ink-muted">
        아직 인용 데이터가 없습니다. 매일 KST 07:00 cron 이 누적 중입니다.
      </div>
    );
  }

  const top = data.partners[0];
  const maxMentions = Math.max(...data.partners.map((p) => p.mentions_30d), 1);

  return (
    <div className="rounded-2xl border border-border bg-surface-base p-6 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
            <Sparkles size={12} /> Partner AI Citation Leaderboard
          </div>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink">
            파트너별 AI 인용 성과 (최근 30일)
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            자동 발행된 콘텐츠가 ChatGPT · Claude · Gemini 에서 실제 인용된 횟수
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-ink-soft num">{data.total_mentions_30d}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-subtle">
            총 인용 (30d)
          </div>
          <div className="mt-1 text-xs text-ink-muted num">
            7d: {data.total_mentions_7d}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {data.partners.map((p, i) => {
          const barPct = (p.mentions_30d / maxMentions) * 100;
          const isTop = i === 0 && p.mentions_30d > 0;
          const deltaIcon =
            p.mentions_delta > 0 ? <TrendingUp size={12} className="text-accent" /> :
            p.mentions_delta < 0 ? <TrendingDown size={12} className="text-red-600" /> :
            <Minus size={12} className="text-ink-subtle" />;
          const deltaText = p.mentions_delta === 0 ? '변동 없음' :
            (p.mentions_delta > 0 ? `+${p.mentions_delta}` : `${p.mentions_delta}`) + ' vs 이전 7일';
          const engineList = Object.entries(p.engines).sort(([, a], [, b]) => b - a);

          return (
            <div
              key={p.tenant_id}
              className={`relative overflow-hidden rounded-xl border p-3.5 transition ${
                isTop ? 'border-border-strong bg-surface-muted/60' : 'border-border bg-white'
              }`}
            >
              {/* 배경 bar */}
              <div
                className={`absolute inset-y-0 left-0 ${isTop ? 'bg-surface-muted/40' : 'bg-surface-subtle/60'}`}
                style={{ width: `${barPct}%` }}
              />
              <div className="relative flex items-center gap-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black text-white ${
                  isTop ? 'bg-ink shadow-md' : 'bg-slate-400'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold text-ink">
                      {p.tenant_name}
                    </div>
                    {p.domain_category && (
                      <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                        {p.domain_category}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                    <span>발행 {p.published_contents}편</span>
                    <span className="flex items-center gap-1">
                      {deltaIcon} {deltaText}
                    </span>
                    <div className="flex items-center gap-1">
                      {engineList.slice(0, 3).map(([eng, cnt]) => (
                        <span
                          key={eng}
                          className={`rounded px-1.5 py-0.5 font-bold ${ENGINE_COLORS[eng] || ENGINE_COLORS.unknown}`}
                        >
                          {eng} {cnt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-ink-soft num">{p.mentions_30d}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-ink-subtle">
                    30d 인용
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {top && top.mentions_30d > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface-muted/60 p-3 text-xs text-ink-soft">
          🏆 <strong>{top.tenant_name}</strong> 이 30일간 <strong>{top.mentions_30d}회</strong> AI 인용으로 1위.{' '}
          {top.mentions_delta > 0 && `최근 7일 +${top.mentions_delta} 증가 추세.`}
        </div>
      )}
    </div>
  );
}
