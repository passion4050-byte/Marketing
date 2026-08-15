/**
 * Round 147 — 병원 클라이언트 포털 홈.
 *
 * 바비톡 병원관리자 홈 레퍼런스(실화면 캡처): KPI 카드 + 증감 배지 + "X 관리 →" 링크 +
 * 격려 카피("모든 후기에 답변했어요") + 주간 트렌드 표.
 * 우리가 실제 제공·실측하는 지표만 노출: 발행 콘텐츠 · AI 언급 · AI 출처 인용 · 상담 클릭.
 * 라벨 규칙(Round 144): mentions = "AI 언급"(브랜드 등장), 출처 인용과 혼용 금지.
 */
import Link from 'next/link';
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';
import { computeReportMetrics } from '@/lib/reportMetrics';
import { makeReportToken } from '@/lib/reportToken';

export const dynamic = 'force-dynamic';

const BLOG_BASE = 'https://wecircle.co.kr';

function contentUrl(
  c: { slug: string | null; is_partner_content: boolean | null; partner_category: string | null },
  partnerSlug: string | null,
): string | null {
  if (!c.slug) return null;
  if (c.is_partner_content && c.partner_category && partnerSlug) {
    return `${BLOG_BASE}/with-partners/${c.partner_category}/${partnerSlug}/${c.slug}`;
  }
  return `${BLOG_BASE}/blog/${c.slug}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default async function ClientHomePage() {
  const session = getClientSession();
  const sb = getServerClient();
  if (!session || !sb) return null; // layout 가드가 이미 처리

  const tenantId = session.tenantId;
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  const [metrics, tenantRow, totalRes, clicks30Res, clicks7Res, clicksPrev7Res, recentRes] =
    await Promise.all([
      computeReportMetrics(sb, tenantId),
      sb.from('tenants').select('partner_slug, name').eq('id', tenantId).maybeSingle(),
      sb
        .from('generated_contents')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'published')
        .eq('channel', 'blog_html'),
      sb
        .from('shortlink_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('clicked_at', iso(now - 30 * 86400_000)),
      sb
        .from('shortlink_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('clicked_at', iso(now - 7 * 86400_000)),
      sb
        .from('shortlink_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('clicked_at', iso(now - 14 * 86400_000))
        .lt('clicked_at', iso(now - 7 * 86400_000)),
      sb
        .from('generated_contents')
        .select('title, slug, published_at, is_partner_content, partner_category')
        .eq('tenant_id', tenantId)
        .eq('status', 'published')
        .eq('channel', 'blog_html')
        .order('published_at', { ascending: false })
        .limit(5),
    ]);

  const partnerSlug = (tenantRow.data as { partner_slug?: string | null } | null)?.partner_slug ?? null;
  const totalPublished = totalRes.count ?? 0;
  const clicks30 = clicks30Res.count ?? 0;
  const clicks7 = clicks7Res.count ?? 0;
  const clicksPrev7 = clicksPrev7Res.count ?? 0;
  const clickDelta =
    clicksPrev7 > 0 ? Math.round(((clicks7 - clicksPrev7) / clicksPrev7) * 100) : null;
  const recent = (recentRes.data ?? []) as Array<{
    title: string | null;
    slug: string | null;
    published_at: string | null;
    is_partner_content: boolean | null;
    partner_category: string | null;
  }>;

  const d = new Date();
  const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const reportToken = makeReportToken(tenantId, period);
  const reportHref = reportToken ? `/report/${tenantId}/${period}?t=${reportToken}` : null;

  const kpis = [
    {
      label: '발행 콘텐츠',
      value: metrics.published30d,
      unit: '편 · 30일',
      sub: `누적 ${totalPublished}편`,
      href: '/client/contents',
      linkLabel: '전체 보기',
    },
    {
      label: 'AI 답변 속 병원 언급',
      value: metrics.mentions30d,
      unit: '회 · 30일',
      sub: `측정 질의 ${metrics.queries30d}건 기준`,
      href: null,
      linkLabel: null,
    },
    {
      label: 'AI 출처 인용',
      value: metrics.ownCitations30d + metrics.clientSiteCitations30d,
      unit: '건 · 30일',
      sub: `위서클 발행 ${metrics.ownCitations30d} · 병원 홈페이지 ${metrics.clientSiteCitations30d}`,
      href: null,
      linkLabel: null,
    },
    {
      label: '상담 클릭',
      value: clicks30,
      unit: '건 · 30일',
      sub:
        clickDelta === null
          ? `최근 7일 ${clicks7}건`
          : `최근 7일 ${clicks7}건 (전주 대비 ${clickDelta >= 0 ? '+' : ''}${clickDelta}%)`,
      href: null,
      linkLabel: null,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">홈</h1>
        <p className="mt-1 text-sm text-stone-500">
          AI 검색(ChatGPT · Perplexity · Gemini)에서 우리 병원이 어떻게 노출되는지 한눈에 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="text-xs font-medium text-stone-500">{k.label}</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums tracking-tight">{k.value}</span>
              <span className="text-xs text-stone-400">{k.unit}</span>
            </div>
            <div className="mt-1.5 text-[11px] leading-relaxed text-stone-400">{k.sub}</div>
            {k.href ? (
              <Link
                href={k.href}
                className="mt-3 inline-block text-xs font-semibold text-stone-700 underline underline-offset-4 hover:text-stone-900"
              >
                {k.linkLabel} →
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">최근 발행 콘텐츠</h2>
            <Link
              href="/client/contents"
              className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-900"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {recent.length === 0 ? (
              <p className="p-5 text-sm text-stone-400">아직 발행된 콘텐츠가 없습니다.</p>
            ) : (
              recent.map((c, i) => {
                const url = contentUrl(c, partnerSlug);
                return (
                  <div key={`${c.slug}-${i}`} className="flex items-center gap-3 p-4">
                    <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-stone-300">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {c.title ?? '(제목 없음)'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-400">{fmtDate(c.published_at)}</p>
                    </div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 transition hover:border-stone-900 hover:text-stone-900"
                      >
                        글 보기
                      </a>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-sm font-bold">콘텐츠 품질 (AEO)</h2>
          <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">{metrics.avgAeo ?? '—'}</span>
              <span className="text-xs text-stone-400">점 · 30일 평균</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
              AI 가 인용하기 좋은 구조(즉답 · 표 · FAQ · 통계)를 갖췄는지에 대한 자동 채점입니다.
            </p>
            <div className="mt-4 flex gap-2 text-[11px]">
              {(['A', 'B', 'C', 'D'] as const).map((g) => (
                <span key={g} className="rounded-lg bg-stone-100 px-2 py-1 tabular-nums text-stone-600">
                  {g} · {metrics.gradeDist[g]}
                </span>
              ))}
            </div>
            {metrics.topContent ? (
              <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
                이번 달 최고 점수: <span className="font-medium text-stone-700">{metrics.topContent.title}</span>{' '}
                ({metrics.topContent.aeo}점)
              </p>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="text-sm font-bold">월간 보고서</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
              이번 달 지표를 한 페이지로 정리한 보고서입니다. 링크는 우리 병원 전용입니다.
            </p>
            {reportHref ? (
              <a
                href={reportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-stone-700"
              >
                {period.replace('-', '년 ')}월 보고서 보기
              </a>
            ) : (
              <p className="mt-3 text-[11px] text-stone-400">보고서 링크 준비 중입니다.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
