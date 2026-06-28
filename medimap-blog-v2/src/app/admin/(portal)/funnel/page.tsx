/**
 * Round 86 (2026-06-28) — Funnel · ROI 실데이터 server component (전면 재설계).
 *
 * 이전 (Round 84): admin-mock 제거 + shortlinks query 만. 'code' 컬럼 추측 오류.
 * 지금: tenant 별 풀스택 funnel.
 *   발행 콘텐츠 → AI 측정 query → 멘션 → ShortLink 클릭
 *   - 실 컬럼: shortlinks.slug + target_url + click_count
 *   - 멘션/측정 비율, 클릭/멘션 비율 등 conversion 카드
 *   - 빈 단계는 명시적 안내 (mock 없음)
 */
import { LinkIcon, FileText, Target, MousePointerClick, Zap } from 'lucide-react';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TenantRow { id: number; name: string; status: string | null; }
interface FunnelRow {
  tenantId: number;
  tenantName: string;
  published: number;
  measureQueries: number;
  mentions: number;
  targetMentions: number;
  shortlinks: number;
  clicks: number;
  citationRate: number; // target_mentions / measure_queries
  ctr: number; // clicks / mentions
}

async function fetchData() {
  const sb = getServerClient();
  if (!sb) return { rows: [] as FunnelRow[], error: 'Supabase 미연결' };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tenants } = await sb.from('tenants').select('id, name, status');
  const { data: contents } = await sb
    .from('generated_contents')
    .select('tenant_id, status, channel')
    .eq('status', 'published')
    .eq('channel', 'blog_html');
  const { data: queries } = await sb
    .from('queries')
    .select('id, tenant_id')
    .gte('requested_at', since);
  const { data: mentions } = await sb
    .from('mentions')
    .select('id, tenant_id, is_target');
  const { data: shortlinks } = await sb
    .from('shortlinks')
    .select('tenant_id, click_count')
    .eq('is_active', true);

  const publishedMap = new Map<number, number>();
  (contents ?? []).forEach((c: { tenant_id: number }) => {
    publishedMap.set(c.tenant_id, (publishedMap.get(c.tenant_id) ?? 0) + 1);
  });
  const queryMap = new Map<number, number>();
  (queries ?? []).forEach((q: { tenant_id: number }) => {
    queryMap.set(q.tenant_id, (queryMap.get(q.tenant_id) ?? 0) + 1);
  });
  const mentionMap = new Map<number, { total: number; target: number }>();
  (mentions ?? []).forEach((m: { tenant_id: number | null; is_target: boolean }) => {
    if (!m.tenant_id) return;
    const prev = mentionMap.get(m.tenant_id) ?? { total: 0, target: 0 };
    mentionMap.set(m.tenant_id, {
      total: prev.total + 1,
      target: prev.target + (m.is_target ? 1 : 0),
    });
  });
  const linkMap = new Map<number, { count: number; clicks: number }>();
  (shortlinks ?? []).forEach((s: { tenant_id: number | null; click_count: number | null }) => {
    if (!s.tenant_id) return;
    const prev = linkMap.get(s.tenant_id) ?? { count: 0, clicks: 0 };
    linkMap.set(s.tenant_id, {
      count: prev.count + 1,
      clicks: prev.clicks + (s.click_count ?? 0),
    });
  });

  const rows: FunnelRow[] = ((tenants ?? []) as TenantRow[])
    .filter((t) => publishedMap.has(t.id) || queryMap.has(t.id) || mentionMap.has(t.id))
    .map((t) => {
      const mt = mentionMap.get(t.id) ?? { total: 0, target: 0 };
      const lk = linkMap.get(t.id) ?? { count: 0, clicks: 0 };
      const q = queryMap.get(t.id) ?? 0;
      return {
        tenantId: t.id,
        tenantName: t.name,
        published: publishedMap.get(t.id) ?? 0,
        measureQueries: q,
        mentions: mt.total,
        targetMentions: mt.target,
        shortlinks: lk.count,
        clicks: lk.clicks,
        citationRate: q > 0 ? (mt.target / q) * 100 : 0,
        ctr: mt.total > 0 ? (lk.clicks / mt.total) * 100 : 0,
      };
    })
    .sort((a, b) => b.targetMentions - a.targetMentions);

  return { rows, error: null };
}

export default async function FunnelPage() {
  const { rows, error } = await fetchData();

  const totals = rows.reduce(
    (acc, r) => ({
      published: acc.published + r.published,
      queries: acc.queries + r.measureQueries,
      mentions: acc.mentions + r.targetMentions,
      shortlinks: acc.shortlinks + r.shortlinks,
      clicks: acc.clicks + r.clicks,
    }),
    { published: 0, queries: 0, mentions: 0, shortlinks: 0, clicks: 0 }
  );
  const overallCitationRate =
    totals.queries > 0 ? (totals.mentions / totals.queries) * 100 : 0;
  const overallCtr = totals.mentions > 0 ? (totals.clicks / totals.mentions) * 100 : 0;

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Funnel · ROI</h1>
          <p className="admin-page-desc">
            발행 → AI 측정 → 멘션 → ShortLink 클릭. 각 단계 전환율을 한눈에 확인합니다 (최근 30일).
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          ⚠ 데이터 로드 실패: {error}
        </div>
      )}

      {/* KPI 5단계 funnel */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <FileText className="h-3 w-3" /> 발행 콘텐츠
          </div>
          <div className="mt-1 text-2xl font-bold text-ink">{totals.published}</div>
          <div className="text-[10px] text-ink-muted">published · blog_html</div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <Zap className="h-3 w-3" /> AI 측정 query
          </div>
          <div className="mt-1 text-2xl font-bold text-ink">{totals.queries.toLocaleString()}</div>
          <div className="text-[10px] text-ink-muted">30일 누적</div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <Target className="h-3 w-3" /> 우리 멘션
          </div>
          <div className="mt-1 text-2xl font-bold text-brand">{totals.mentions.toLocaleString()}</div>
          <div className="text-[10px] text-ink-muted">전환율 {overallCitationRate.toFixed(1)}%</div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <LinkIcon className="h-3 w-3" /> ShortLink
          </div>
          <div className="mt-1 text-2xl font-bold text-ink">{totals.shortlinks}</div>
          <div className="text-[10px] text-ink-muted">발급된 추적 링크</div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <MousePointerClick className="h-3 w-3" /> 클릭
          </div>
          <div className="mt-1 text-2xl font-bold text-status-success">{totals.clicks.toLocaleString()}</div>
          <div className="text-[10px] text-ink-muted">CTR {overallCtr.toFixed(2)}%</div>
        </div>
      </section>

      {/* Tenant 별 funnel 표 */}
      <section className="card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">테넌트별 Funnel (최근 30일)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            발행 후 AI 측정 query 가 누적되면 멘션이 발생합니다 — 멘션이 0 이면 측정 query 자체가 아직 적거나, 콘텐츠/키워드 조정이 필요
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-muted">
            아직 추적 가능한 tenant 가 없습니다 — 발행/측정/멘션 어느 하나라도 데이터가 있어야 표시됩니다
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left">테넌트</th>
                  <th className="px-3 py-2.5 text-right">발행</th>
                  <th className="px-3 py-2.5 text-right">측정 query</th>
                  <th className="px-3 py-2.5 text-right">우리 멘션</th>
                  <th className="px-3 py-2.5 text-right">인용률</th>
                  <th className="px-3 py-2.5 text-right">ShortLink</th>
                  <th className="px-3 py-2.5 text-right">클릭</th>
                  <th className="px-3 py-2.5 text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.tenantId} className="border-t border-border hover:bg-surface-subtle">
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-semibold text-ink">{r.tenantName}</div>
                      <div className="text-[10px] text-ink-muted">tenant #{r.tenantId}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{r.published}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-muted">
                      {r.measureQueries.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-brand">
                      {r.targetMentions.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {r.citationRate > 0 ? `${r.citationRate.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-muted">
                      {r.shortlinks > 0 ? r.shortlinks : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {r.clicks > 0 ? r.clicks.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {r.ctr > 0 ? (
                        <span className="font-bold text-status-success">{r.ctr.toFixed(2)}%</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ShortLink 인프라 안내 (클릭 0 일 때) */}
      {totals.shortlinks === 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface-subtle p-5">
          <div className="flex items-start gap-3">
            <LinkIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-ink-muted" />
            <div className="text-sm">
              <div className="font-semibold text-ink">ShortLink 추적 인프라 — 다음 단계</div>
              <p className="mt-1 text-xs text-ink-muted">
                AI 인용에서 실제 문의/예약까지 ROI 측정하려면 콘텐츠 CTA 를 <code className="rounded bg-white px-1 py-0.5 text-[11px]">/r/&lt;slug&gt;</code> 형식
                ShortLink 로 발급해야 합니다. 현재 발급된 링크 0건.
              </p>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs text-ink-muted">
                <li>generator.py 의 include_cta=True 가 자동으로 ShortLink 발급하도록 인프라 연결 (Round 24 trace_url 모듈 활용)</li>
                <li>발행 콘텐츠의 카카오톡/예약 CTA 가 모두 ShortLink 로 자동 변환되도록 cron 후처리</li>
                <li>shortlink_clicks 누적되기 시작하면 이 표의 클릭·CTR 자동 채워짐</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
