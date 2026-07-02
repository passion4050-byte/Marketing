'use client';

/**
 * Round 110-C (2026-07-02) — 카카오톡 UTM 유입 위젯.
 * UX: 클릭 스파크라인 + 이벤트 분포 + 페이지 top + 캠페인 top.
 */
import { useEffect, useState } from 'react';
import { MessageCircle, TrendingUp, TrendingDown, Minus, Layers } from 'lucide-react';

interface EventStat { event: string; clicks_7d: number; clicks_30d: number; delta: number }
interface DailyPoint { date: string; total: number; by_event: Record<string, number> }
interface PageRow { page_path: string; clicks: number; primary_event: string }
interface CampaignRow { utm_campaign: string; clicks: number }
interface Data {
  summary: {
    total_7d: number;
    total_30d: number;
    delta: number;
    top_event: string | null;
    top_page: string | null;
  };
  events_30d: EventStat[];
  daily_30d: DailyPoint[];
  top_pages_30d: PageRow[];
  top_campaigns_30d: CampaignRow[];
}

const EVENT_META: Record<string, { label: string; color: string; accent: string }> = {
  kakao_cta_click: { label: 'CTA 버튼', color: 'from-yellow-400 to-amber-500', accent: 'bg-yellow-500' },
  kakao_channel_click: { label: '채널 홈', color: 'from-amber-400 to-orange-500', accent: 'bg-amber-500' },
  kakao_floating_click: { label: '플로팅', color: 'from-orange-400 to-red-500', accent: 'bg-orange-500' },
  kakao_beacon: { label: 'Beacon', color: 'from-slate-400 to-slate-500', accent: 'bg-slate-500' },
};

function eventMeta(name: string) {
  return EVENT_META[name] ?? { label: name, color: 'from-gray-400 to-gray-500', accent: 'bg-gray-500' };
}

export function KakaoFunnelWidget() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/kakao-referrals')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-base p-6">
        <div className="h-6 w-56 animate-pulse rounded bg-surface-hover" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-hover/50" />)}
        </div>
      </div>
    );
  }

  if (!data || data.summary.total_30d === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-base p-6">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand">
          <MessageCircle size={12} /> Kakao Funnel
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-subtle/40 p-8 text-center">
          <MessageCircle size={36} className="mx-auto text-ink-subtle" />
          <div className="mt-3 text-sm font-bold text-ink">아직 카카오톡 클릭 로그가 없습니다</div>
          <div className="mt-1 text-xs text-ink-muted">
            /api/track/kakao beacon 이 CTA 클릭 시 자동 누적됩니다.
          </div>
        </div>
      </div>
    );
  }

  const { summary, events_30d, daily_30d, top_pages_30d, top_campaigns_30d } = data;
  const maxDaily = Math.max(...daily_30d.map(d => d.total), 1);
  const deltaSign = summary.delta > 0 ? '+' : '';
  const deltaColor = summary.delta > 0 ? 'text-emerald-600' : summary.delta < 0 ? 'text-red-600' : 'text-ink-subtle';

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-yellow-50/40 via-surface-base to-surface-base p-6 shadow-soft">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>
            <MessageCircle size={12} /> Kakao Funnel
          </div>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink">
            카카오톡 유입 트래킹
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            wecircle.co.kr 방문자가 카카오톡 상담으로 얼마나 넘어갔는지
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black num" style={{ color: '#F59E0B' }}>{summary.total_7d.toLocaleString()}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-subtle">
            7일 클릭
          </div>
          <div className={`mt-1 text-xs font-bold num ${deltaColor}`}>
            {deltaSign}{summary.delta.toLocaleString()} WoW
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <KpiCard label="30일 총 클릭" value={summary.total_30d.toLocaleString()} />
        <KpiCard
          label="주력 채널"
          value={summary.top_event ? eventMeta(summary.top_event).label : '-'}
          accent
        />
        <KpiCard
          label="최다 유입 페이지"
          value={summary.top_page && summary.top_page.length > 20 ? summary.top_page.slice(0, 18) + '…' : (summary.top_page ?? '-')}
          mono
        />
      </div>

      {/* Timeline sparkline */}
      <div className="mt-6 rounded-xl border border-border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-subtle">
            일별 클릭 (30d)
          </div>
          <div className="text-xs text-ink-muted num">peak {maxDaily}</div>
        </div>
        <div className="mt-3 flex h-14 items-end gap-[3px]">
          {daily_30d.map((d) => {
            const h = Math.max(4, (d.total / maxDaily) * 100);
            return (
              <div
                key={d.date}
                className="group relative flex-1 rounded-t-sm transition-all hover:scale-105"
                style={{
                  height: `${h}%`,
                  background: 'linear-gradient(to top, #F59E0B, #FBBF24)',
                  opacity: 0.6 + (d.total / maxDaily) * 0.4,
                }}
                title={`${d.date} · ${d.total} clicks`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-ink-subtle">
          <span>{daily_30d[0]?.date}</span>
          <span>{daily_30d[daily_30d.length - 1]?.date}</span>
        </div>
      </div>

      {/* Event distribution */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-subtle">
            이벤트별 클릭 분포
          </div>
          <div className="space-y-2">
            {events_30d.map((e) => {
              const meta = eventMeta(e.event);
              const share = summary.total_30d > 0 ? (e.clicks_30d / summary.total_30d) * 100 : 0;
              const deltaIcon = e.delta > 0
                ? <TrendingUp size={11} className="text-emerald-600" />
                : e.delta < 0
                  ? <TrendingDown size={11} className="text-red-600" />
                  : <Minus size={11} className="text-ink-subtle" />;
              return (
                <div key={e.event} className="relative overflow-hidden rounded-lg border border-border p-2.5">
                  <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${meta.color} opacity-10`} style={{ width: `${share}%` }} />
                  <div className="relative flex items-center gap-3">
                    <div className={`h-6 w-1.5 shrink-0 rounded-full ${meta.accent}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-ink">{meta.label}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-muted num">
                        <span>{share.toFixed(1)}% share</span>
                        <span className="flex items-center gap-0.5">
                          {deltaIcon} {e.delta > 0 ? '+' : ''}{e.delta} WoW
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-ink num">{e.clicks_30d}</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-ink-subtle">30d</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top pages */}
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-subtle">
            유입 상위 페이지 (30d)
          </div>
          <div className="space-y-1.5">
            {top_pages_30d.map((p, i) => (
              <div key={p.page_path} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                <span className="w-5 shrink-0 text-center font-bold text-ink-subtle">{i + 1}</span>
                <a
                  href={p.page_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink hover:text-brand"
                >
                  {p.page_path}
                </a>
                <span className="w-10 shrink-0 text-right text-xs font-black num" style={{ color: '#F59E0B' }}>
                  {p.clicks}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns */}
      {top_campaigns_30d.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ink-subtle">
            <Layers size={12} /> UTM 캠페인 상위 (30d)
          </div>
          <div className="flex flex-wrap gap-2">
            {top_campaigns_30d.map((c) => (
              <span key={c.utm_campaign} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900">
                {c.utm_campaign}
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] text-white num">{c.clicks}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'border-amber-200 bg-amber-50/40' : 'border-border bg-white'}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-subtle">{label}</div>
      <div
        className={`mt-1.5 text-lg font-black tracking-tight ${mono ? 'font-mono text-sm' : ''} ${accent ? '' : 'text-ink'} num`}
        style={accent ? { color: '#F59E0B' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
