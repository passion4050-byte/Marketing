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
// Round 165 — 다국어 URL 빌더 공용화 (해외 글 링크 404 수정) + 언어 배지
import { publicContentUrl, LANG_LABEL } from '@/lib/contentUrl';

export const dynamic = 'force-dynamic';

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
      // Round 165 — is_bot=false 필터. Round 163d 에서 봇 클릭(82%)을 플래그로 분리했는데
      //   포털 카운트가 필터 없이 전량을 세고 있었음 (병원에 부풀린 수치가 나가던 버그).
      sb
        .from('shortlink_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_bot', false)
        .gte('clicked_at', iso(now - 30 * 86400_000)),
      sb
        .from('shortlink_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_bot', false)
        .gte('clicked_at', iso(now - 7 * 86400_000)),
      sb
        .from('shortlink_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_bot', false)
        .gte('clicked_at', iso(now - 14 * 86400_000))
        .lt('clicked_at', iso(now - 7 * 86400_000)),
      sb
        .from('generated_contents')
        .select('title, slug, published_at, is_partner_content, partner_category, lang, market')
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
  // Round 153 (감사 P1-6) — 소표본 % 는 공포만 유발("2→0 = -100%") → 전주 5건 미만이면 숨김
  const clickDelta =
    clicksPrev7 >= 5 ? Math.round(((clicks7 - clicksPrev7) / clicksPrev7) * 100) : null;
  const recent = (recentRes.data ?? []) as Array<{
    title: string | null;
    slug: string | null;
    published_at: string | null;
    is_partner_content: boolean | null;
    partner_category: string | null;
    lang: string | null;
    market: string | null;
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
      // Round 153 (감사 P2-10) — "측정 질의" 내부용어 → 실무진 눈높이
      // Round 169 — 0 일 때는 '결과'가 아니라 '단계'로 읽히도록 맥락 부여
      sub:
        metrics.mentions30d === 0
          ? `AI 에 ${metrics.queries30d}번 물어본 결과 · 이름 등장은 통상 3~4주부터`
          : `AI 에 ${metrics.queries30d}번 물어본 결과 기준`,
      href: '/client/mentions',
      linkLabel: '세부 내역',
    },
    {
      label: 'AI 출처 인용',
      value: metrics.ownCitations30d + metrics.clientSiteCitations30d,
      unit: '건 · 30일',
      // Round 153 (감사 P1-5) — 0 에 맥락 부여: 보고서의 "첫 인용 통상 5~6주" 안내 이식
      sub:
        metrics.ownCitations30d + metrics.clientSiteCitations30d === 0
          ? '발행 후 첫 인용까지 통상 5~6주 (색인 적재 기간)'
          : `위서클 발행 ${metrics.ownCitations30d} · 병원 홈페이지 ${metrics.clientSiteCitations30d}`,
      href: '/client/citations',
      linkLabel: '세부 내역',
    },
    {
      label: '상담 클릭',
      value: clicks30,
      unit: '건 · 30일',
      // Round 169 — 봇 제외 사실을 고객 화면에 명시. 설명 없는 하락은 해지, 설명 있는 하락은 신뢰다.
      sub:
        clickDelta === null
          ? `최근 7일 ${clicks7}건 · 자동 프로그램 제외한 실제 클릭`
          : `최근 7일 ${clicks7}건 (전주 대비 ${clickDelta >= 0 ? '+' : ''}${clickDelta}%) · 봇 제외`,
      href: '/client/clicks',
      linkLabel: '세부 내역',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight md:text-xl">홈</h1>
        <p className="mt-1.5 break-keep text-[13.5px] leading-relaxed text-stone-500 md:text-sm">
          AI 검색(ChatGPT · Perplexity · Gemini · Claude)에서 우리 병원이 어떻게 노출되는지 한눈에 확인하세요.
        </p>
      </div>

      {/* 🔴 Round 169 (2026-08-20) — 모바일 KPI 재설계.
          기존: 카드 내부 폭 121px 에서 12px 라벨이 3줄, 11px sub 가 5줄로 무너지고
          드릴다운은 패딩 없는 16px 텍스트 링크. text-stone-400 은 대비 2.5:1 로 AA 미달.
          변경: ① 카드 전체를 Link 로(터치 면적 = 카드 전체) ② 라벨 13px·숫자 28px 로 승격
          ③ sub 는 line-clamp-2 + stone-500 로 대비 확보 ④ break-keep 으로 한글 단어 단위 줄바꿈 */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-4 transition active:border-stone-400 active:bg-stone-50 md:p-5 lg:hover:border-stone-400"
          >
            <div className="break-keep text-[13px] font-medium leading-snug text-stone-500 md:text-xs">
              {k.label}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[28px] font-bold leading-none tabular-nums tracking-tight md:text-3xl">
                {k.value}
              </span>
              <span className="text-[11px] text-stone-400 md:text-xs">{k.unit}</span>
            </div>
            <div className="mt-2 line-clamp-2 break-keep text-[11.5px] leading-relaxed text-stone-500 md:text-[11px]">
              {k.sub}
            </div>
            <div className="mt-auto pt-3 text-[11.5px] font-semibold text-stone-700 md:text-xs">
              {k.linkLabel} <span aria-hidden>→</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold md:text-sm">최근 발행 콘텐츠</h2>
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
                const url = publicContentUrl(c, partnerSlug);
                const langLabel = LANG_LABEL[c.lang ?? 'ko'] ?? c.lang;
                return (
                  <div key={`${c.slug}-${i}`} className="flex items-center gap-3 p-4">
                    <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-stone-300">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-keep text-[14px] font-medium leading-snug text-stone-800 md:truncate md:text-sm">
                        {c.title ?? '(제목 없음)'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-400">
                        {fmtDate(c.published_at)}
                        {langLabel && langLabel !== '한국어' ? (
                          <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-500">
                            {langLabel}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-[40px] shrink-0 items-center rounded-lg border border-stone-200 px-3 text-[12px] font-medium text-stone-600 transition active:border-stone-900 active:text-stone-900 md:min-h-0 md:px-2.5 md:py-1 md:text-[11px]"
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
          {/* Round 169 — '인용'이 한 화면에서 두 의미로 충돌(위 KPI=실제 인용 건수).
              '콘텐츠 구조 점수'로 개명하고 실제 인용과 다른 지표임을 명시. */}
          <h2 className="text-[15px] font-bold md:text-sm">콘텐츠 구조 점수</h2>
          <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">{metrics.avgAeo ?? '—'}</span>
              <span className="text-xs text-stone-400">점 · 30일 평균</span>
            </div>
            <p className="mt-2 break-keep text-[12px] leading-relaxed text-stone-500">
              AI 가 인용하기 좋은 구조(즉답 · 표 · FAQ · 통계)를 갖췄는지 자동 채점한 값입니다.
              <b className="text-stone-700"> 실제 인용 건수와는 다른 지표</b>이며, 점수가 높을수록
              인용될 확률이 올라갑니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11.5px]">
              {(['A', 'B', 'C', 'D'] as const).map((g) => (
                <span
                  key={g}
                  className="rounded-lg bg-stone-100 px-2.5 py-1.5 tabular-nums text-stone-600"
                >
                  <b className="text-stone-800">{g}</b> {metrics.gradeDist[g]}편
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-stone-400">
              A = 즉답·표·FAQ·통계를 모두 갖춘 구조 / D = 보완 필요
            </p>
            {metrics.topContent ? (
              <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
                이번 달 최고 점수: <span className="font-medium text-stone-700">{metrics.topContent.title}</span>{' '}
                ({metrics.topContent.aeo}점)
              </p>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="text-[15px] font-bold md:text-sm">월간 보고서</h3>
            <p className="mt-2 break-keep text-[12px] leading-relaxed text-stone-500">
              이번 달 지표를 한 페이지로 정리한 보고서입니다. 원장님께 그대로 공유하실 수 있고,
              링크는 우리 병원 전용입니다.
            </p>
            {reportHref ? (
              <a
                href={reportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 inline-flex min-h-[44px] items-center rounded-xl bg-stone-900 px-4 text-[13px] font-semibold text-white transition active:bg-stone-700 md:min-h-0 md:rounded-lg md:px-3.5 md:py-2 md:text-xs"
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
