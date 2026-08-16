/**
 * Round 157 (2026-08-16) — /admin/traffic 유입 분석 대시보드.
 *
 * "실제로 효과가 있는가"를 한 화면에서: GSC(Google 검색) + GA4(전체 유입·AI referral)
 * 실측을 병원별 · 검색어별 · 콘텐츠별로 귀속해 보여준다.
 * 데이터: search-traffic-sync cron → gsc_daily·gsc_query_daily·ga4_daily·ga4_source_daily.
 * 집계: SQL RPC traffic_* · 귀속: src/lib/traffic.ts.
 */
import { Search, Bot, MousePointerClick, Eye } from 'lucide-react';
import { fetchTrafficDashboard } from '@/lib/traffic';
import { TrafficTrendChart } from '@/components/admin/TrafficTrendChart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 28;

export default async function TrafficPage() {
  const data = await fetchTrafficDashboard(WINDOW_DAYS);
  const { totals } = data;
  const gscLive = totals.gscDays > 0;
  const ga4Live = totals.ga4Days > 0;

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">유입 분석</h1>
          <p className="admin-page-desc">
            Google 검색(GSC) + 사이트 방문(GA4) 실측 — 병원별 · 검색어별 · 콘텐츠별 귀속 (최근 {WINDOW_DAYS}일).
          </p>
        </div>
      </header>

      {data.errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          ⚠ 일부 데이터 로드 실패: {data.errors.join(' · ')}
        </div>
      )}

      {/* KPI */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <MousePointerClick className="h-3 w-3" /> Google 검색 클릭
          </div>
          <div className="mt-1 text-2xl font-bold text-ink">
            {gscLive ? totals.gscClicks.toLocaleString() : '—'}
          </div>
          <div className="text-[10px] text-ink-muted">
            {gscLive
              ? `CTR ${totals.gscImpressions > 0 ? ((totals.gscClicks / totals.gscImpressions) * 100).toFixed(2) : '0.00'}%`
              : 'GSC 수집 대기'}
          </div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <Eye className="h-3 w-3" /> 검색 노출
          </div>
          <div className="mt-1 text-2xl font-bold text-ink">
            {gscLive ? totals.gscImpressions.toLocaleString() : '—'}
          </div>
          <div className="text-[10px] text-ink-muted">{gscLive ? `적재 ${totals.gscDays}일` : 'GSC 수집 대기'}</div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <Search className="h-3 w-3" /> 전체 세션 (GA4)
          </div>
          <div className="mt-1 text-2xl font-bold text-ink">
            {ga4Live ? totals.ga4Sessions.toLocaleString() : '—'}
          </div>
          <div className="text-[10px] text-ink-muted">{ga4Live ? `적재 ${totals.ga4Days}일` : 'GA4 수집 대기'}</div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-muted">
            <Bot className="h-3 w-3" /> AI 엔진 유입
          </div>
          <div className="mt-1 text-2xl font-bold text-accent-deep">
            {ga4Live ? totals.aiSessions.toLocaleString() : '—'}
          </div>
          <div className="text-[10px] text-ink-muted">ChatGPT·Perplexity 등 referral 세션</div>
        </div>
      </section>

      {/* 추이 */}
      <section className="card mb-6">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">유입 추이 (최근 90일)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            막대 = Google 검색 클릭 · 초록 = 전체 세션 · 보라 = AI 엔진 유입. AI 인용이 실제 방문으로 이어지는지 여기서 확인합니다.
          </div>
        </header>
        <div className="px-5 py-4">
          <TrafficTrendChart
            data={data.series.map((p) => ({
              d: p.d,
              gscClicks: p.gscClicks,
              ga4Sessions: p.ga4Sessions,
              aiSessions: p.aiSessions,
            }))}
          />
        </div>
      </section>

      {/* 병원별 */}
      <section className="card mb-6">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">병원별 유입 (최근 {WINDOW_DAYS}일)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            콘텐츠 경로를 병원으로 귀속한 합계. 발행 → 검색 노출 → 방문이 실제로 어느 병원에서 일어나는지.
          </div>
        </header>
        {data.tenants.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">
            병원 귀속 가능한 유입이 아직 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left">병원</th>
                  <th className="px-3 py-2.5 text-right">검색 클릭</th>
                  <th className="px-3 py-2.5 text-right">검색 노출</th>
                  <th className="px-3 py-2.5 text-right">세션 (GA4)</th>
                  <th className="px-3 py-2.5 text-right" title="유입이 잡힌 발행 콘텐츠 수">유입 콘텐츠</th>
                </tr>
              </thead>
              <tbody>
                {data.tenants.map((t) => (
                  <tr key={t.tenantId} className="border-t border-border hover:bg-surface-subtle">
                    <td className="px-3 py-2.5 text-sm font-semibold text-ink">{t.tenantName}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-soft">
                      {t.gscClicks > 0 ? t.gscClicks.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-muted">
                      {t.gscImpressions > 0 ? t.gscImpressions.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">
                      {t.ga4Sessions > 0 ? t.ga4Sessions.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{t.contents || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 검색어별 */}
      <section className="card mb-6">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">실제 검색어 (GSC · 최근 {WINDOW_DAYS}일)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            사람들이 실제로 입력한 검색어. <strong className="text-ink-soft">측정중</strong> 배지 = AI 인용 측정 키워드 풀과
            일치 — 검색 수요와 측정 전략이 맞물리는 지점입니다.
          </div>
        </header>
        {data.queries.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">
            {gscLive ? '검색어 데이터가 아직 없습니다.' : 'GSC 수집 대기 — 크론 첫 성공 후 표시됩니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left">검색어</th>
                  <th className="px-3 py-2.5 text-right">클릭</th>
                  <th className="px-3 py-2.5 text-right">노출</th>
                  <th className="px-3 py-2.5 text-right">평균 순위</th>
                </tr>
              </thead>
              <tbody>
                {data.queries.map((q) => (
                  <tr key={q.query} className="border-t border-border hover:bg-surface-subtle">
                    <td className="px-3 py-2.5">
                      <span className="text-sm text-ink">{q.query}</span>
                      {q.matchedKeyword && (
                        <span className="ml-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                          측정중
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-soft">
                      {q.clicks > 0 ? q.clicks.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-muted">
                      {q.impressions.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {q.avgPosition > 0 ? q.avgPosition.toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 콘텐츠별 */}
      <section className="card mb-6">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">콘텐츠별 유입 톱 30 (최근 {WINDOW_DAYS}일)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            페이지 경로를 발행 콘텐츠에 귀속. 어떤 글이 실제 유입을 만드는지 — 키워드 로테이션·증산 판단의 근거.
          </div>
        </header>
        {data.contents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">유입이 잡힌 페이지가 아직 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left">콘텐츠 / 경로</th>
                  <th className="px-3 py-2.5 text-left">병원</th>
                  <th className="px-3 py-2.5 text-right">검색 클릭</th>
                  <th className="px-3 py-2.5 text-right">노출</th>
                  <th className="px-3 py-2.5 text-right">순위</th>
                  <th className="px-3 py-2.5 text-right">세션</th>
                </tr>
              </thead>
              <tbody>
                {data.contents.map((c) => (
                  <tr key={c.path} className="border-t border-border hover:bg-surface-subtle">
                    <td className="max-w-[340px] px-3 py-2.5">
                      <div className="truncate text-sm font-semibold text-ink">{c.title ?? c.path}</div>
                      <div className="truncate text-[10px] text-ink-muted">
                        {c.path}
                        {c.keyword && ` · 키워드: ${c.keyword}`}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-soft">{c.tenantName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-soft">
                      {c.gscClicks > 0 ? c.gscClicks.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-muted">
                      {c.gscImpressions > 0 ? c.gscImpressions.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {c.avgPosition !== null ? c.avgPosition.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">
                      {c.ga4Sessions > 0 ? c.ga4Sessions.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 유입 소스 */}
      <section className="card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">유입 소스 (GA4 · 최근 {WINDOW_DAYS}일)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            <strong className="text-accent-deep">AI</strong> 배지 = AI 엔진 referral. GEO 성과의 직접 증거이며 0이면
            아직 AI 인용 → 방문 전환이 시작되지 않은 것입니다.
          </div>
        </header>
        {data.sources.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-muted">GA4 소스 데이터가 아직 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left">소스</th>
                  <th className="px-3 py-2.5 text-left">매체</th>
                  <th className="px-3 py-2.5 text-right">세션</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={`${s.source}|${s.medium}`} className="border-t border-border hover:bg-surface-subtle">
                    <td className="px-3 py-2.5">
                      <span className="text-sm text-ink">{s.source}</span>
                      {s.isAi && (
                        <span className="ml-1.5 rounded-full bg-accent-deep/10 px-2 py-0.5 text-[10px] font-bold text-accent-deep">
                          AI
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">{s.medium || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-soft">
                      {s.sessions.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
