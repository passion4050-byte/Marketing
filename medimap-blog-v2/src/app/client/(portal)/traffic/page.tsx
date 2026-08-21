/**
 * Round 158 (2026-08-16) — 병원 클라이언트 포털 · 검색 유입.
 *
 * 병원 관점으로만 분류해 보여준다:
 *   ① 우리 병원을 찾아본 검색 (병원명 포함 검색어 — 브랜드 수요)
 *   ② 시술 수요 검색 (이 병원의 측정 키워드와 매칭되는 일반 검색어 — 시장 수요)
 *   ③ 우리 콘텐츠 방문 (이 병원 발행 콘텐츠 페이지의 노출·클릭·방문)
 * + 각 표마다 "이 숫자를 어떻게 읽어야 하는지" 기대 안내.
 *
 * 카피 규칙(Round 153): 소표본 % 표기 금지 · 내부 용어 금지 · 성과 부풀림 금지.
 * 데이터: fetchTenantTraffic (자기 tenant 만 — 세션의 tenantId 강제).
 */
import { getClientSession } from '@/lib/client-auth';
import { fetchTenantTraffic } from '@/lib/traffic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 28;

export default async function ClientTrafficPage() {
  const session = getClientSession();
  if (!session) return null; // layout 가드가 redirect 처리

  const data = await fetchTenantTraffic(session.tenantId, WINDOW_DAYS);
  const t = data.totals;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight md:text-xl">검색 유입</h1>
        <p className="mt-1.5 break-keep text-[13.5px] leading-relaxed text-stone-500 md:text-sm">
          Google 검색에서 우리 병원과 콘텐츠가 어떻게 노출·방문되는지 실측 집계입니다 (최근 {WINDOW_DAYS}일).
        </p>
      </div>

      {data.errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          일부 데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
        </div>
      )}

      {!data.hasGsc ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
          <div className="text-sm font-semibold text-stone-700">검색 유입 데이터 수집 준비 중입니다</div>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500">
            Google 검색 데이터는 수집 시작 후 순차적으로 쌓입니다. 콘텐츠 발행 초기에는 노출이 적은 것이
            정상이며, 통상 발행 후 수 주에 걸쳐 색인과 노출이 늘어납니다.
          </p>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <section className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="break-keep text-[12px] font-semibold leading-snug text-stone-500">
                병원명 검색 노출
              </div>
              <div className="mt-1.5 text-[26px] font-bold leading-none tabular-nums md:text-2xl">{t.brandImpressions.toLocaleString()}</div>
              <div className="mt-1.5 break-keep text-[11.5px] leading-snug text-stone-400">우리 병원명이 들어간 검색</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="break-keep text-[12px] font-semibold leading-snug text-stone-500">
                병원명 검색 클릭
              </div>
              <div className="mt-1.5 text-[26px] font-bold leading-none tabular-nums md:text-2xl">{t.brandClicks.toLocaleString()}</div>
              <div className="mt-1.5 break-keep text-[11.5px] leading-snug text-stone-400">검색 결과에서 우리 글 클릭</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="break-keep text-[12px] font-semibold leading-snug text-stone-500">
                콘텐츠 검색 노출
              </div>
              <div className="mt-1.5 text-[26px] font-bold leading-none tabular-nums md:text-2xl">{t.contentImpressions.toLocaleString()}</div>
              <div className="mt-1.5 break-keep text-[11.5px] leading-snug text-stone-400">발행 콘텐츠의 검색 노출</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="break-keep text-[12px] font-semibold leading-snug text-stone-500">
                콘텐츠 방문
              </div>
              <div className="mt-1.5 text-[26px] font-bold leading-none tabular-nums md:text-2xl">{t.contentSessions.toLocaleString()}</div>
              <div className="mt-1.5 break-keep text-[11.5px] leading-snug text-stone-400">발행 콘텐츠 방문 세션</div>
            </div>
          </section>

          {/* ① 우리 병원을 찾아본 검색 */}
          <section className="mb-6 rounded-xl border border-stone-200 bg-white">
            <header className="border-b border-stone-100 px-5 py-3.5">
              <h2 className="text-[15px] font-bold md:text-sm">우리 병원을 찾아본 검색</h2>
              <p className="mt-1.5 break-keep text-[12.5px] leading-relaxed text-stone-500 md:mt-0.5 md:text-[11px]">
                병원명이 포함된 검색어입니다. 이 수요는 브랜드 인지도가 만든 것으로, 늘어날수록 상담으로
                이어질 가능성이 가장 높은 유입입니다.
              </p>
            </header>
            {data.brandQueries.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-stone-400">
                아직 병원명 검색이 집계되지 않았습니다 — 콘텐츠 노출이 쌓이면 함께 늘어납니다.
              </div>
            ) : (
              <>
              {/* Round 169 — 모바일: 표(min-w-520px)에서 '평균 순위'가 처음부터 화면 밖이었다.
                  순위는 이 페이지 서사의 핵심이므로 카드 1줄에 검색어, 2줄에 순위·노출·클릭. */}
              <div className="divide-y divide-stone-100 md:hidden">
                {data.brandQueries.map((q) => (
                  <div key={q.query} className="px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 break-keep text-[14px] font-medium leading-snug text-stone-800">
                        {q.query}
                      </div>
                      
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-stone-500">
                      <span>
                        순위{' '}
                        <b className="tabular-nums text-stone-800">
                          {q.avgPosition > 0 ? `${q.avgPosition.toFixed(1)}위` : '—'}
                        </b>
                      </span>
                      <span className="text-stone-300" aria-hidden>·</span>
                      <span>노출 <b className="tabular-nums text-stone-700">{q.impressions.toLocaleString()}</b></span>
                      <span className="text-stone-300" aria-hidden>·</span>
                      <span>클릭 <b className="tabular-nums text-stone-700">{q.clicks > 0 ? q.clicks.toLocaleString() : '—'}</b></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="bg-stone-50 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left">검색어</th>
                    <th className="px-4 py-2.5 text-right">노출</th>
                    <th className="px-4 py-2.5 text-right">클릭</th>
                    <th className="px-4 py-2.5 text-right">평균 순위</th>
                  </tr>
                </thead>
                <tbody>
                  {data.brandQueries.map((q) => (
                    <tr key={q.query} className="border-t border-stone-100">
                      <td className="px-4 py-2.5 text-sm font-medium text-stone-800">{q.query}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{q.impressions.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {q.clicks > 0 ? q.clicks.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {q.avgPosition > 0 ? `${q.avgPosition.toFixed(1)}위` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </>
            )}
          </section>

          {/* ② 시술 수요 검색 */}
          <section className="mb-6 rounded-xl border border-stone-200 bg-white">
            <header className="border-b border-stone-100 px-5 py-3.5">
              <h2 className="text-[15px] font-bold md:text-sm">시술 수요 검색</h2>
              <p className="mt-1.5 break-keep text-[12.5px] leading-relaxed text-stone-500 md:mt-0.5 md:text-[11px]">
                우리 병원이 공략 중인 시술 검색어의 노출 현황입니다 (발행 채널 전체 기준). 평균 순위가
                10위 안으로 들어오면 클릭이 본격적으로 발생하기 시작합니다.
              </p>
            </header>
            {data.procedureQueries.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-stone-400">
                아직 시술 검색어 노출이 집계되지 않았습니다 — 색인 누적에 통상 수 주가 걸립니다.
              </div>
            ) : (
              <>
              {/* Round 169 — 모바일: 표(min-w-520px)에서 '평균 순위'가 처음부터 화면 밖이었다.
                  순위는 이 페이지 서사의 핵심이므로 카드 1줄에 검색어, 2줄에 순위·노출·클릭. */}
              <div className="divide-y divide-stone-100 md:hidden">
                {data.procedureQueries.map((q) => (
                  <div key={q.query} className="px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 break-keep text-[14px] font-medium leading-snug text-stone-800">
                        {q.query}
                      </div>
                      {q.avgPosition >= 4 && q.avgPosition <= 20 && (
                        <span className="shrink-0 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white">
                          1페이지 임박
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-stone-500">
                      <span>
                        순위{' '}
                        <b className="tabular-nums text-stone-800">
                          {q.avgPosition > 0 ? `${q.avgPosition.toFixed(1)}위` : '—'}
                        </b>
                      </span>
                      <span className="text-stone-300" aria-hidden>·</span>
                      <span>노출 <b className="tabular-nums text-stone-700">{q.impressions.toLocaleString()}</b></span>
                      <span className="text-stone-300" aria-hidden>·</span>
                      <span>클릭 <b className="tabular-nums text-stone-700">{q.clicks > 0 ? q.clicks.toLocaleString() : '—'}</b></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="bg-stone-50 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left">검색어</th>
                    <th className="px-4 py-2.5 text-right">노출</th>
                    <th className="px-4 py-2.5 text-right">클릭</th>
                    <th className="px-4 py-2.5 text-right">평균 순위</th>
                  </tr>
                </thead>
                <tbody>
                  {data.procedureQueries.map((q) => (
                    <tr key={q.query} className="border-t border-stone-100">
                      <td className="px-4 py-2.5 text-sm font-medium text-stone-800">
                        {q.query}
                        {q.avgPosition >= 4 && q.avgPosition <= 20 && (
                          <span className="ml-1.5 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white">
                            1페이지 임박
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{q.impressions.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {q.clicks > 0 ? q.clicks.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {q.avgPosition > 0 ? `${q.avgPosition.toFixed(1)}위` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </>
            )}
          </section>

          {/* ③ 우리 콘텐츠 방문 */}
          <section className="mb-6 rounded-xl border border-stone-200 bg-white">
            <header className="border-b border-stone-100 px-5 py-3.5">
              <h2 className="text-[15px] font-bold md:text-sm">우리 콘텐츠 방문</h2>
              <p className="mt-1.5 break-keep text-[12.5px] leading-relaxed text-stone-500 md:mt-0.5 md:text-[11px]">
                발행된 콘텐츠별 검색 노출과 방문입니다. 방문이 잡히는 글이 상담 문의의 입구가 됩니다.
              </p>
            </header>
            {data.contents.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-stone-400">
                아직 콘텐츠 방문이 집계되지 않았습니다.
              </div>
            ) : (
              <>
              {/* Round 169 — 모바일 카드 (제목 우선, 지표는 한 줄로) */}
              <div className="divide-y divide-stone-100 md:hidden">
                {data.contents.map((c) => (
                  <div key={c.path} className="px-4 py-3.5">
                    <div className="break-keep text-[14px] font-medium leading-snug text-stone-800">
                      {c.title ?? c.path}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-stone-500">
                      <span>노출 <b className="tabular-nums text-stone-700">{c.gscImpressions > 0 ? c.gscImpressions.toLocaleString() : '—'}</b></span>
                      <span className="text-stone-300" aria-hidden>·</span>
                      <span>클릭 <b className="tabular-nums text-stone-700">{c.gscClicks > 0 ? c.gscClicks.toLocaleString() : '—'}</b></span>
                      <span className="text-stone-300" aria-hidden>·</span>
                      <span>방문 <b className="tabular-nums text-stone-800">{c.ga4Sessions > 0 ? c.ga4Sessions.toLocaleString() : '—'}</b></span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="bg-stone-50 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left">콘텐츠</th>
                    <th className="px-4 py-2.5 text-right">노출</th>
                    <th className="px-4 py-2.5 text-right">클릭</th>
                    <th className="px-4 py-2.5 text-right">방문</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contents.map((c) => (
                    <tr key={c.path} className="border-t border-stone-100">
                      <td className="max-w-[320px] px-4 py-2.5">
                        <div className="truncate text-sm font-medium text-stone-800">{c.title ?? c.path}</div>
                        <div className="truncate text-[10px] text-stone-400">{c.path}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {c.gscImpressions > 0 ? c.gscImpressions.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {c.gscClicks > 0 ? c.gscClicks.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {c.ga4Sessions > 0 ? c.ga4Sessions.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </>
            )}
          </section>

          {/* 기대 안내 */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-[13px] leading-relaxed text-stone-600 md:p-5 md:text-xs">
            <div className="mb-1.5 text-[15px] font-bold text-stone-800 md:text-sm">이 숫자, 이렇게 읽으세요</div>
            <p className="break-keep">
              <strong>노출</strong>은 검색 결과에 우리 글이 뜬 횟수, <strong>클릭</strong>은 그중 실제로
              들어온 횟수입니다. 새 콘텐츠는 색인 → 노출 → 순위 상승 → 클릭 순서로 자리를 잡으며 이 과정에
              통상 수 주가 걸립니다. 순위가 20위권(2페이지)에서 10위 안(1페이지)으로 올라오는 시점부터
              클릭이 눈에 띄게 생기기 시작합니다 — 지금 노출이 쌓이고 있다면 그 전 단계가 진행 중인
              것입니다. 문의로 이어지는 상담 클릭은 홈의 <strong>상담 클릭</strong> 지표에서 확인할 수
              있습니다.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
