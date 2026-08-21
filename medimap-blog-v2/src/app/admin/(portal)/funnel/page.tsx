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
import { LinkIcon, FileText, Target, MousePointerClick, Zap, Search, Bot } from 'lucide-react';
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
  // 질의당 브랜드 등장 배수. 1 response 에 mention 이 N건 생길 수 있어
  // 정의상 1.0 을 초과할 수 있음 → % 가 아니라 "배" 로 표기 (Round 144).
  mentionsPerQuery: number;
  ctr: number; // clicks / mentions
  /**
   * Round 144b — 신규 클라이언트가 목록에서 통째로 사라지던 문제.
   * 이전엔 발행·측정·멘션이 모두 0이면 filter 에서 탈락해, 방금 등록한
   * 클라이언트(예: 밝은눈안과 강남점)가 화면에 아예 안 보였음.
   * 운영자 입장에선 "등록했는데 없다"로 보여 온보딩 누락을 못 잡는다.
   */
  stage: 'measuring' | 'published_only' | 'awaiting_setup';
}

/**
 * Round 156 (2026-08-16) — 사이트 유입 실측 (GSC + GA4).
 * "3개월 문의 0" 진단의 마지막 미지수 = 절대 유입량.
 * 적재는 search-traffic-sync.yml cron → gsc_daily / ga4_source_daily.
 */
interface TrafficSummary {
  gscDays: number; // 적재된 일수 (0 = 크론 미가동)
  gscClicks: number;
  gscImpressions: number;
  gscAvgPosition: number; // 노출 가중 평균
  ga4Days: number;
  ga4Sessions: number;
  aiSessions: number; // AI 엔진 referral 세션
  aiTop: { source: string; sessions: number }[];
}

const AI_SOURCE_PATTERNS = [
  'chatgpt', 'openai', 'perplexity', 'gemini', 'claude', 'anthropic',
  'copilot', 'you.com', 'felo', 'liner', 'wrtn',
];

function isAiSource(source: string): boolean {
  const s = source.toLowerCase();
  return AI_SOURCE_PATTERNS.some((p) => s.includes(p));
}

async function fetchTraffic(): Promise<TrafficSummary> {
  const empty: TrafficSummary = {
    gscDays: 0, gscClicks: 0, gscImpressions: 0, gscAvgPosition: 0,
    ga4Days: 0, ga4Sessions: 0, aiSessions: 0, aiTop: [],
  };
  const sb = getServerClient();
  if (!sb) return empty;

  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // 🔴 드릴다운 조용한 400 교훈(Round 153) — error 를 버리지 않는다.
  const [gscRes, ga4Res] = await Promise.all([
    sb.from('gsc_daily').select('date, clicks, impressions, position').gte('date', since),
    sb.from('ga4_source_daily').select('date, source, sessions').gte('date', since),
  ]);
  if (gscRes.error) console.error('[funnel] gsc_daily 조회 실패:', gscRes.error.message);
  if (ga4Res.error) console.error('[funnel] ga4_source_daily 조회 실패:', ga4Res.error.message);

  const gscRows = (gscRes.data ?? []) as {
    date: string; clicks: number; impressions: number; position: number;
  }[];
  const ga4Rows = (ga4Res.data ?? []) as {
    date: string; source: string; sessions: number;
  }[];

  const gscDates = new Set<string>();
  let gscClicks = 0;
  let gscImpressions = 0;
  let posWeighted = 0;
  gscRows.forEach((r) => {
    gscDates.add(r.date);
    gscClicks += r.clicks ?? 0;
    gscImpressions += r.impressions ?? 0;
    posWeighted += (r.position ?? 0) * (r.impressions ?? 0);
  });

  const ga4Dates = new Set<string>();
  let ga4Sessions = 0;
  const aiBySource = new Map<string, number>();
  ga4Rows.forEach((r) => {
    ga4Dates.add(r.date);
    ga4Sessions += r.sessions ?? 0;
    if (isAiSource(r.source ?? '')) {
      aiBySource.set(r.source, (aiBySource.get(r.source) ?? 0) + (r.sessions ?? 0));
    }
  });
  const aiTop = Array.from(aiBySource.entries())
    .map(([source, sessions]) => ({ source, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);
  const aiSessions = Array.from(aiBySource.values()).reduce((acc, v) => acc + v, 0);

  return {
    gscDays: gscDates.size,
    gscClicks,
    gscImpressions,
    gscAvgPosition: gscImpressions > 0 ? posWeighted / gscImpressions : 0,
    ga4Days: ga4Dates.size,
    ga4Sessions,
    aiSessions,
    aiTop,
  };
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
  // 🔴 Round 144 (2026-08-02) — 기간 필터 누락 수정.
  //   분모(queries)에만 30일 필터가 있고 분자(mentions)에는 없어서
  //   "인용률 226.2%" 같은 100% 초과 값이 프로덕션에 노출됐음.
  const { data: mentions } = await sb
    .from('mentions')
    .select('id, tenant_id, is_target')
    .gte('created_at', since);
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

  // Round 144b — 필터 제거. 발행·측정 0인 신규 클라이언트도 "온보딩 대기"로 노출.
  const rows: FunnelRow[] = ((tenants ?? []) as TenantRow[])
    .map((t) => {
      const mt = mentionMap.get(t.id) ?? { total: 0, target: 0 };
      const lk = linkMap.get(t.id) ?? { count: 0, clicks: 0 };
      const q = queryMap.get(t.id) ?? 0;
      const published = publishedMap.get(t.id) ?? 0;
      const stage: FunnelRow['stage'] =
        q > 0 ? 'measuring' : published > 0 ? 'published_only' : 'awaiting_setup';
      return {
        tenantId: t.id,
        tenantName: t.name,
        published,
        measureQueries: q,
        mentions: mt.total,
        targetMentions: mt.target,
        shortlinks: lk.count,
        clicks: lk.clicks,
        mentionsPerQuery: q > 0 ? mt.target / q : 0,
        ctr: mt.total > 0 ? (lk.clicks / mt.total) * 100 : 0,
        stage,
      };
    })
    // 측정 중인 곳을 위로, 그 안에서 멘션 많은 순. 온보딩 대기는 맨 아래.
    .sort((a, b) => {
      const rank = (s: FunnelRow['stage']) =>
        s === 'measuring' ? 0 : s === 'published_only' ? 1 : 2;
      const d = rank(a.stage) - rank(b.stage);
      return d !== 0 ? d : b.targetMentions - a.targetMentions;
    });

  return { rows, error: null };
}

export default async function FunnelPage() {
  const [{ rows, error }, traffic] = await Promise.all([fetchData(), fetchTraffic()]);

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
  /**
   * Round 144c — 추적 링크가 하나라도 발급됐으면 클릭 컬럼을 노출한다.
   * 발급 전에는 전 행이 "—" 라 화면만 먹으므로 숨긴다.
   */
  const trackingLive = totals.shortlinks > 0;

  return (
    // Round 169 (2026-08-20) — 모바일: px-8 하드코딩 → 반응형(md+ 는 기존 px-8 복원)
    <div className="px-4 py-5 md:px-8 md:py-6">
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
          <div className="mt-1 text-2xl font-bold text-ink-soft">{totals.mentions.toLocaleString()}</div>
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

      {/* Round 156 — 사이트 유입 실측 (GSC · GA4). 최근 28일 */}
      <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="card card-pad">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
              <Search className="h-3 w-3" /> Google 검색 유입 (GSC · 28일)
            </div>
            <a href="/admin/traffic" className="text-[10px] font-bold text-accent-deep hover:underline">
              유입 분석 →
            </a>
          </div>
          {traffic.gscDays > 0 ? (
            <>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-2xl font-bold text-ink">{traffic.gscClicks.toLocaleString()}</span>
                <span className="text-xs text-ink-muted">클릭</span>
                <span className="text-sm font-semibold text-ink-soft">{traffic.gscImpressions.toLocaleString()}</span>
                <span className="text-xs text-ink-muted">노출</span>
              </div>
              <div className="mt-1 text-[10px] text-ink-muted">
                평균 순위 {traffic.gscAvgPosition.toFixed(1)}위
                {' · '}CTR {traffic.gscImpressions > 0 ? ((traffic.gscClicks / traffic.gscImpressions) * 100).toFixed(2) : '0.00'}%
                {' · '}적재 {traffic.gscDays}일
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-ink-muted">
              수집 대기 — <code className="rounded bg-surface-subtle px-1 py-0.5 text-[11px]">search-traffic-sync</code> 크론
              첫 실행 전입니다 (secret 등록 필요).
            </div>
          )}
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <Bot className="h-3 w-3" /> 전체 세션 · AI 엔진 유입 (GA4 · 28일)
          </div>
          {traffic.ga4Days > 0 ? (
            <>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-2xl font-bold text-ink">{traffic.ga4Sessions.toLocaleString()}</span>
                <span className="text-xs text-ink-muted">세션</span>
                <span className="text-sm font-bold text-accent-deep">{traffic.aiSessions.toLocaleString()}</span>
                <span className="text-xs text-ink-muted">AI 엔진 referral</span>
              </div>
              <div className="mt-1 text-[10px] text-ink-muted">
                {traffic.aiTop.length > 0
                  ? traffic.aiTop.map((s) => `${s.source} ${s.sessions}`).join(' · ')
                  : 'AI referral 아직 없음'}
                {' · '}적재 {traffic.ga4Days}일
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-ink-muted">
              수집 대기 — GA4 태그 배포 + 속성 생성 후 데이터가 쌓입니다.
            </div>
          )}
        </div>
      </section>

      {/* Tenant 별 funnel 표 */}
      <section className="card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">테넌트별 Funnel (최근 30일)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            발행 → 측정 질의 누적 → AI 답변에 브랜드 등장. 등장이 0이면 측정 질의가 아직 적거나 키워드 조정이 필요합니다.
            <strong className="text-ink-soft"> 발행 42일 미만은 아직 색인 적재 중일 수 있어 판단을 유보하세요.</strong>
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-muted">
            등록된 클라이언트가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs">
              {/*
                Round 144b/c — 추적 컬럼을 조건부로.
                미발급 상태에서는 전 행이 "—" 라 화면 폭만 먹었으므로 숨기고,
                추적 링크가 발급된 뒤에는(Round 144c) 상담 클릭 컬럼을 노출한다.
                "발행당 등장" 은 콘텐츠 효율을 보는 상시 지표라 항상 표시.
              */}
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left">클라이언트</th>
                  <th className="px-3 py-2.5 text-right">발행</th>
                  <th className="px-3 py-2.5 text-right">측정 질의</th>
                  <th className="px-3 py-2.5 text-right">브랜드 등장</th>
                  <th className="px-3 py-2.5 text-right" title="브랜드 등장 ÷ 측정 질의. 한 응답에 여러 번 등장할 수 있어 1배를 넘을 수 있습니다.">질의당 등장</th>
                  <th className="px-3 py-2.5 text-right" title="브랜드 등장 ÷ 발행 편수. 콘텐츠 1편당 얼마나 노출로 이어졌는지.">발행당 등장</th>
                  {trackingLive && (
                    <th className="px-3 py-2.5 text-right" title="발행 콘텐츠의 카카오 상담 CTA 클릭 수 (추적 링크 경유 서버 기록).">상담 클릭</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const perPublished = r.published > 0 ? r.targetMentions / r.published : 0;
                  return (
                  <tr key={r.tenantId} className="border-t border-border hover:bg-surface-subtle">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink">{r.tenantName}</span>
                        {r.stage === 'awaiting_setup' && (
                          <span className="rounded-full bg-status-warningSoft px-2 py-0.5 text-[10px] font-bold text-status-warning">
                            온보딩 대기
                          </span>
                        )}
                        {r.stage === 'published_only' && (
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                            측정 대기
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        tenant #{r.tenantId}
                        {r.stage === 'awaiting_setup' && ' · 키워드 등록 + 발행 설정 필요'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{r.published || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-muted">
                      {r.measureQueries > 0 ? r.measureQueries.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-soft">
                      {r.targetMentions > 0 ? r.targetMentions.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {r.mentionsPerQuery > 0 ? `${r.mentionsPerQuery.toFixed(2)}배` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {perPublished > 0 ? (
                        <span className={perPublished >= 10 ? 'font-bold text-accent-deep' : 'text-ink-soft'}>
                          {perPublished.toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    {trackingLive && (
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {r.clicks > 0 ? (
                          <span className="font-bold text-status-success">{r.clicks.toLocaleString()}</span>
                        ) : r.shortlinks > 0 ? (
                          <span className="text-ink-faint">0</span>
                        ) : '—'}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 유입·전환 추적 상태 */}
      <div className="mt-4 rounded-lg border border-border bg-surface-subtle p-5">
        <div className="flex items-start gap-3">
          <LinkIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-ink-muted" />
          <div className="text-sm">
            {trackingLive ? (
              <>
                <div className="font-semibold text-ink">
                  유입·전환 추적 — <span className="text-status-success">가동 중</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  발행 콘텐츠의 카카오 상담 CTA 가 추적 링크(<code className="rounded bg-white px-1 py-0.5 text-[11px]">/r/k-&lt;클라이언트&gt;</code>)를
                  경유합니다. 클릭은 서버에 기록되며 위 <strong className="text-ink-soft">상담 클릭</strong> 컬럼에 반영됩니다.
                  {totals.clicks === 0 && ' 아직 클릭이 없습니다 — 콘텐츠 방문자가 발생하면 누적됩니다.'}
                </p>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  발급된 추적 링크 {totals.shortlinks}건 · 누적 클릭 {totals.clicks.toLocaleString()}건
                  {totals.mentions > 0 && ` · 브랜드 등장 대비 ${overallCtr.toFixed(2)}%`}
                </p>
              </>
            ) : (
              <>
                <div className="font-semibold text-ink">
                  유입·전환 추적 — <span className="text-status-warning">미연결</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  추적 링크가 발급되지 않아 AI 노출에서 실제 문의까지의 전환이 측정되지 않습니다.
                  클라이언트에 <code className="rounded bg-white px-1 py-0.5 text-[11px]">partner_slug</code> 가
                  설정돼 있는지 확인하세요.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
