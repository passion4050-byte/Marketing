'use client';

/**
 * Round 110-B (2026-07-02) — AI 크롤러 로그 위젯.
 * UX: 히트맵 스파크라인 + 봇 랭킹 + 페이지 top + 델타 인사이트.
 */
import { useEffect, useState } from 'react';
import { Bot, TrendingUp, TrendingDown, Minus, Radio, Globe } from 'lucide-react';

interface BotStat {
  bot_name: string;
  hits_7d: number;
  hits_30d: number;
  hits_delta: number;
  share_pct: number;
}
interface DailyPoint { date: string; total: number; by_bot: Record<string, number> }
interface PathRow { path: string; hits: number; top_bot: string }
interface Data {
  summary: {
    total_7d: number;
    total_30d: number;
    unique_bots_7d: number;
    top_bot: string | null;
    wow_delta: number;
  };
  bots_30d: BotStat[];
  daily_30d: DailyPoint[];
  top_paths_30d: PathRow[];
}

const BOT_META: Record<string, { label: string; color: string; accent: string }> = {
  gptbot: { label: 'GPTBot', color: 'from-status-success to-teal-500', accent: 'bg-status-success' },
  'oai-searchbot': { label: 'OAI-SearchBot', color: 'from-accent to-cyan-500', accent: 'bg-accent' },
  'chatgpt-user': { label: 'ChatGPT-User', color: 'from-accent/40 to-teal-400', accent: 'bg-accent/40' },
  claudebot: { label: 'ClaudeBot', color: 'from-purple-500 to-fuchsia-500', accent: 'bg-purple-500' },
  'claude-web': { label: 'Claude-Web', color: 'from-purple-400 to-pink-500', accent: 'bg-purple-400' },
  perplexitybot: { label: 'PerplexityBot', color: 'from-orange-500 to-amber-500', accent: 'bg-orange-500' },
  'perplexity-user': { label: 'Perplexity-User', color: 'from-orange-400 to-yellow-400', accent: 'bg-orange-400' },
  'google-extended': { label: 'Google-Extended', color: 'from-blue-500 to-sky-500', accent: 'bg-blue-500' },
  googleother: { label: 'GoogleOther', color: 'from-blue-400 to-indigo-500', accent: 'bg-blue-400' },
  ccbot: { label: 'CCBot (CommonCrawl)', color: 'from-slate-500 to-zinc-500', accent: 'bg-slate-500' },
  bytespider: { label: 'Bytespider', color: 'from-pink-500 to-rose-500', accent: 'bg-pink-500' },
  'meta-externalagent': { label: 'Meta AI', color: 'from-indigo-500 to-blue-500', accent: 'bg-indigo-500' },
  amazonbot: { label: 'Amazonbot', color: 'from-yellow-500 to-orange-500', accent: 'bg-yellow-500' },
  'applebot-extended': { label: 'Applebot-Extended', color: 'from-slate-600 to-slate-800', accent: 'bg-slate-600' },
  diffbot: { label: 'Diffbot', color: 'from-cyan-500 to-teal-500', accent: 'bg-cyan-500' },
  unknown: { label: 'Unknown', color: 'from-gray-400 to-gray-500', accent: 'bg-gray-400' },
};

function botMeta(name: string) {
  return BOT_META[name] ?? BOT_META.unknown;
}

export function CrawlerLogWidget() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/crawler-stats')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-base p-6">
        <div className="h-6 w-56 animate-pulse rounded bg-surface-hover" />
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-hover/50" />)}
        </div>
      </div>
    );
  }

  if (!data || data.summary.total_30d === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-base p-6">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand">
          <Bot size={12} /> AI Crawler Radar
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-subtle/40 p-8 text-center">
          <Radio size={36} className="mx-auto text-ink-subtle" />
          <div className="mt-3 text-sm font-bold text-ink">아직 크롤러 방문 로그가 없습니다</div>
          <div className="mt-1 text-xs text-ink-muted">
            middleware 로 GPTBot · ClaudeBot · PerplexityBot 등 감지 시 자동 누적됩니다.
          </div>
        </div>
      </div>
    );
  }

  const { summary, bots_30d, daily_30d, top_paths_30d } = data;
  const deltaSign = summary.wow_delta > 0 ? '+' : '';
  const deltaColor = summary.wow_delta > 0 ? 'text-accent' : summary.wow_delta < 0 ? 'text-red-600' : 'text-ink-subtle';
  const maxDaily = Math.max(...daily_30d.map(d => d.total), 1);

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-base to-slate-50/40 p-6 shadow-soft">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand">
            <Bot size={12} /> AI Crawler Radar
          </div>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink">
            AI 크롤러 방문 로그
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            GPTBot · ClaudeBot · PerplexityBot 등이 wecircle.co.kr 을 얼마나 자주 크롤하는지
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-brand num">{summary.total_7d.toLocaleString()}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-subtle">
            7일 방문
          </div>
          <div className={`mt-1 text-xs font-bold num ${deltaColor}`}>
            {deltaSign}{summary.wow_delta.toLocaleString()} WoW
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<Globe size={14} />}
          label="30일 총 방문"
          value={summary.total_30d.toLocaleString()}
        />
        <KpiCard
          icon={<Bot size={14} />}
          label="7일 활성 봇"
          value={String(summary.unique_bots_7d)}
        />
        <KpiCard
          icon={<Radio size={14} />}
          label="1위 봇"
          value={summary.top_bot ? botMeta(summary.top_bot).label : '-'}
          accent
        />
        <KpiCard
          icon={<TrendingUp size={14} />}
          label="WoW 델타"
          value={`${deltaSign}${summary.wow_delta}`}
          highlight={summary.wow_delta > 0}
        />
      </div>

      {/* Daily heatmap sparkline */}
      <div className="mt-6 rounded-xl border border-border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-subtle">
            일별 방문 (30d)
          </div>
          <div className="text-xs text-ink-muted num">
            peak {maxDaily.toLocaleString()}
          </div>
        </div>
        <div className="mt-3 flex h-14 items-end gap-[3px]">
          {daily_30d.map((d) => {
            const h = Math.max(4, (d.total / maxDaily) * 100);
            const intensity = d.total / maxDaily;
            return (
              <div
                key={d.date}
                className="group relative flex-1 rounded-t-sm bg-gradient-to-t from-brand to-brand-400 transition-all hover:from-accent hover:to-accent-400"
                style={{
                  height: `${h}%`,
                  opacity: 0.5 + intensity * 0.5,
                }}
                title={`${d.date} · ${d.total} hits`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-ink-subtle">
          <span>{daily_30d[0]?.date}</span>
          <span>{daily_30d[daily_30d.length - 1]?.date}</span>
        </div>
      </div>

      {/* Two columns: bot ranking + top paths */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Bot ranking */}
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-subtle">
              봇별 크롤 랭킹 (30d)
            </div>
          </div>
          <div className="space-y-2">
            {bots_30d.slice(0, 8).map((b, i) => {
              const meta = botMeta(b.bot_name);
              const deltaIcon = b.hits_delta > 0
                ? <TrendingUp size={11} className="text-accent" />
                : b.hits_delta < 0
                  ? <TrendingDown size={11} className="text-red-600" />
                  : <Minus size={11} className="text-ink-subtle" />;
              return (
                <div key={b.bot_name} className="relative overflow-hidden rounded-lg border border-border p-2.5">
                  <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${meta.color} opacity-10`} style={{ width: `${Math.min(100, b.share_pct * 2)}%` }} />
                  <div className="relative flex items-center gap-3">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${meta.accent}`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-ink">{meta.label}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-muted">
                        <span className="num">{b.share_pct}% share</span>
                        <span className="flex items-center gap-0.5 num">
                          {deltaIcon}
                          {b.hits_delta > 0 ? '+' : ''}{b.hits_delta} WoW
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-ink num">{b.hits_30d.toLocaleString()}</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-ink-subtle">
                        30d
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top paths */}
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-subtle">
              크롤 상위 페이지 (30d)
            </div>
          </div>
          <div className="space-y-1.5">
            {top_paths_30d.map((p, i) => (
              <div key={p.path} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                <span className="w-5 shrink-0 text-center font-bold text-ink-subtle">{i + 1}</span>
                <a
                  href={p.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink hover:text-brand"
                  title={p.path}
                >
                  {p.path}
                </a>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${botMeta(p.top_bot).accent}`}>
                  {botMeta(p.top_bot).label}
                </span>
                <span className="w-10 shrink-0 text-right text-xs font-black text-brand num">
                  {p.hits}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insight banner */}
      {summary.top_bot && (
        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-xs text-ink-soft">
          🤖 지난 7일간 <strong>{botMeta(summary.top_bot).label}</strong> 방문이 가장 많음.{' '}
          {summary.wow_delta > 0 && `이번 주 +${summary.wow_delta.toLocaleString()} 증가 — AI 인덱싱 활발.`}
          {summary.wow_delta < 0 && `이번 주 ${summary.wow_delta.toLocaleString()} 감소 — 콘텐츠 재발행 검토.`}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'border-brand-200 bg-brand-50/30' : highlight ? 'border-accent/30 bg-accent-soft/40' : 'border-border bg-white'}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-subtle">
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 text-lg font-black tracking-tight num ${accent ? 'text-brand' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  );
}
