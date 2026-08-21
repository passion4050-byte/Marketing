/**
 * Round 152 — 포털 드릴다운: 상담 클릭 세부 내역.
 * 발행 콘텐츠의 상담 버튼(/r/ 추적 링크) 클릭 로그 — 최근 30일.
 */
import Link from 'next/link';
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function ClientClicksPage() {
  const session = getClientSession();
  const sb = getServerClient();
  if (!session || !sb) return null;

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  // Round 154 (배치 C1 · 감사 P1-8) — shortlink slug('p{content_id}') 파싱으로
  // "어느 글에서 눌렸는지" 귀속. 구 k-{partner} 클릭은 글 미상으로 표기.
  // Round 165 — is_bot=false 필터 (Round 163d 봇 분리 후 포털 목록에 필터 누락돼
  //   병원이 봇 클릭까지 실상담으로 보던 버그).
  const { data } = await sb
    .from('shortlink_clicks')
    .select('clicked_at, country, referer, shortlinks(slug)')
    .eq('tenant_id', session.tenantId)
    .eq('is_bot', false)
    .gte('clicked_at', since)
    .order('clicked_at', { ascending: false })
    .limit(200);

  type ClickRow = {
    clicked_at: string | null;
    country: string | null;
    referer: string | null;
    shortlinks: { slug?: string | null } | Array<{ slug?: string | null }> | null;
  };
  const raw = (data ?? []) as unknown as ClickRow[];
  const contentIds = new Set<number>();
  const slugOf = (r: ClickRow) => {
    const s = Array.isArray(r.shortlinks) ? r.shortlinks[0]?.slug : r.shortlinks?.slug;
    return (s ?? '').trim();
  };
  for (const r of raw) {
    const m = slugOf(r).match(/^p(\d+)$/);
    if (m) contentIds.add(Number(m[1]));
  }
  const titleById = new Map<number, string>();
  if (contentIds.size > 0) {
    const { data: titles } = await sb
      .from('generated_contents')
      .select('id, title')
      .in('id', [...contentIds].slice(0, 200));
    for (const t of (titles ?? []) as Array<{ id: number; title: string | null }>) {
      if (t.title) titleById.set(t.id, t.title);
    }
  }
  const rows = raw.map((r) => {
    const m = slugOf(r).match(/^p(\d+)$/);
    return {
      clicked_at: r.clicked_at,
      country: r.country,
      referer: r.referer,
      contentTitle: m ? titleById.get(Number(m[1])) ?? null : null,
    };
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight md:text-xl">상담 클릭</h1>
        <p className="mt-1.5 break-keep text-[13.5px] leading-relaxed text-stone-500 md:text-sm">
          발행 콘텐츠의 상담 버튼이 눌린 기록입니다 (최근 30일{' '}
          <span className="font-semibold tabular-nums text-stone-700">{rows.length}</span>건).
          클릭 후 대화는 카카오톡에서 이어집니다.
        </p>
      </div>

      {/* 🔴 Round 169 — 봇 제외 설명. Round 163d 에서 봇 클릭 82% 를 걷어내며 수치가 급감했는데
          고객 화면에는 설명이 한 줄도 없었다. 원장이 "지난달 40건이라며?" 라고 물을 때
          담당자가 그대로 읽어서 답할 수 있는 문장이어야 한다. */}
      <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-4 md:p-5">
        <div className="text-[13.5px] font-bold text-stone-800">이 숫자는 &lsquo;사람&rsquo; 클릭만 셉니다</div>
        <p className="mt-2 break-keep text-[13px] leading-relaxed text-stone-600">
          검색엔진 수집기 같은 <b className="text-stone-800">자동 프로그램(봇)</b>도 링크를 누릅니다.
          위서클은 이런 클릭을 <b className="text-stone-800">전부 제외</b>하고 실제 사람이 누른 것만
          집계합니다. 예전보다 숫자가 줄어 보인다면 성과가 준 것이 아니라{' '}
          <b className="text-stone-800">허수를 걷어낸 것</b>입니다 — 원장님께는 &lsquo;문의로
          이어질 수 있는 진짜 클릭&rsquo;으로 설명해 주세요.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 md:p-6">
          <div className="text-[15px] font-bold text-stone-800">아직 상담 클릭이 없습니다</div>
          <p className="mt-2.5 break-keep text-[13.5px] leading-relaxed text-stone-600">
            상담 클릭은 <b className="text-stone-800">콘텐츠가 검색·AI 답변에 노출된 다음</b> 단계에서
            발생합니다. 지금은 노출을 쌓는 시기이며, 검색 유입이 늘기 시작하면 이 지표가 따라 움직입니다.
          </p>
          <Link
            href="/client/traffic"
            className="mt-3.5 inline-flex min-h-[44px] items-center rounded-xl bg-stone-900 px-4 text-[13px] font-semibold text-white active:bg-stone-700"
          >
            검색 유입 현황 보기 →
          </Link>
        </div>
      ) : (
        <>
          {/* 모바일: 표 대신 카드 — 시각과 '어느 글에서 눌렸는지'(Round 154 귀속)를 앞에 세운다.
              유입 경로는 판단에 쓰지 않으므로 모바일에서 숨김. */}
          <div className="space-y-2.5 md:hidden">
            {rows.map((c, i) => (
              <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-center gap-2 text-[11.5px] text-stone-400">
                  <span className="tabular-nums">{fmtDateTime(c.clicked_at)}</span>
                  {c.country ? (
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-medium text-stone-500">
                      {c.country}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 break-keep text-[14px] font-medium leading-snug text-stone-800">
                  {c.contentTitle ?? (
                    <span className="text-stone-400">글 미상 (예전 방식 링크)</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 데스크톱: 기존 표 유지 */}
          <div className="hidden overflow-x-auto border-t-2 border-stone-900 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-4 py-2.5 font-medium">시각</th>
                  <th className="px-4 py-2.5 font-medium">글</th>
                  <th className="px-4 py-2.5 font-medium">국가</th>
                  <th className="px-4 py-2.5 font-medium">유입 경로</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={i} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2.5 tabular-nums text-stone-700">{fmtDateTime(c.clicked_at)}</td>
                    <td className="max-w-[280px] truncate px-4 py-2.5 text-stone-700">
                      {c.contentTitle ?? <span className="text-stone-400">글 미상 (예전 방식 링크)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">{c.country ?? '—'}</td>
                    <td className="max-w-[360px] truncate px-4 py-2.5 text-stone-500">
                      {(() => {
                        // Round 153 (감사 P2-12) — 긴 URL 대신 경로만 (모바일 가로스크롤 완화)
                        if (!c.referer) return '직접 접속';
                        try {
                          const u = new URL(c.referer);
                          const path = decodeURIComponent(u.pathname);
                          return u.hostname.includes('wecircle')
                            ? path
                            : `${u.hostname.replace(/^www\./, '')}${path === '/' ? '' : path}`;
                        } catch {
                          return c.referer.replace(/^https?:\/\//, '');
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
