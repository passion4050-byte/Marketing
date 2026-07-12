/**
 * Round 32 phase C (2026-05-30) — AI 인용 분석 페이지 + 클라이언트 selector + 세부 데이터.
 *
 * 구조:
 *   상단: 클라이언트 selector (탭/드롭다운) + 새로고침
 *   KPI 카드 4개 — 선택된 클라이언트 기준
 *   차트 4개:
 *     1. 30일 Mention Trend (line)
 *     2. Source 분류 도넛 (T1~T5)
 *     3. Top 10 Source Domain (bar)
 *     4. 위서클 Source Share Trend (line)
 *   세부 데이터:
 *     - 키워드별 인용 분석 (mention/source/T1/T2/T5 카운트)
 *     - 경쟁사/플랫폼 도메인 분석 (어떤 키워드에서 인용됐는지)
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { readScope, SCOPE_EVENT } from '@/components/admin/ScopeSelector';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { CitationsTabs } from '@/components/admin/CitationsTabs';
import { CitationBreakdown, DomainTick, DomainLink, type Citation } from '@/components/admin/CitationBreakdown';
import { useListView, PageBar, SearchBox } from '@/components/admin/ListView';

type TenantOption = { id: number; name: string; is_self: boolean };

type KeywordResponseDetail = {
  response_id: number;
  engine: string;
  prompt: string;
  tenant_name: string;
  raw_text: string;
  cited_urls: string[];
  source_domains: Array<{ domain: string; final_url: string | null }>;
  mentions: Array<{ brand: string; weight: number; context_snippet: string; is_target: boolean }>;
  created_at: string;
};

type CitationsData = {
  tenants: TenantOption[];
  selected_tenant: TenantOption | null;
  mention_trend: Array<{ date: string; count: number }>;
  source_tier: { T1: number; T2: number; T3: number; T4: number; T5: number; total: number };
  top_domains: Array<{ domain: string; count: number; tier: string; keywords: string[] }>;
  medimap_share_trend: Array<{ date: string; share_pct: number }>;
  keyword_breakdown: Array<{
    keyword: string;
    source_count: number;
    t1: number;
    t2: number;
    t5: number;
    mention_count: number;
  }>;
  competitor_breakdown: Array<{
    domain: string;
    tier: string;
    count: number;
    keywords: string[];
    urls: string[];
    citations: Citation[];
  }>;
};

// Round 124-C (2026-07-04) — 잉크 베이스 조화 팔레트: 민트(자사 계열) + 뮤트 골드(권위)
//   + slate 단계. 튀는 원색(블루/퍼플/앰버) 제거하되 단조로움 회피 — 유채색은 2계열만.
const TIER_LABELS: Record<string, { label: string; color: string; short: string }> = {
  T1: { label: '위서클 자체 ⭐', color: '#15B8A6', short: '위서클' },
  T2: { label: '클라이언트 자체', color: '#059669', short: '클라이언트' },
  T3: { label: '권위/공식', color: '#E8A33D', short: '권위' },
  T4: { label: '의료 플랫폼', color: '#7C3AED', short: '플랫폼' },
  T5: { label: '기타 (경쟁사)', color: '#818CF8', short: '경쟁사' },
};

export default function CitationsPage() {
  // Round 34 phase 5 (2026-05-30): URL query 로 tenantId 공유 (자사 ↔ 경쟁사 탭 전환 시 유지)
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTenantId = (() => {
    const v = searchParams.get('tenantId');
    return v ? Number(v) || null : null;
  })();
  const [tenantId, setTenantIdState] = useState<number | null>(initialTenantId);
  // setTenantId 호출 시 URL 도 자동 update
  const setTenantId = (id: number | null) => {
    setTenantIdState(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id == null) params.delete('tenantId');
    else params.set('tenantId', String(id));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const [data, setData] = useState<CitationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 도메인 expand state (URL 목록 펼치기)
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  // 클라이언트 selector 검색 + 드롭다운
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  // Round 75 — 기간 필터 (일수)
  const [days, setDays] = useState(30);
  // 언어 스코프 (헤더 ScopeSelector 와 동기화) + race 가드용 seq
  const [scope, setScope] = useState('all');
  const reqSeq = useRef(0);
  // 키워드 클릭 → modal
  const [modalKeyword, setModalKeyword] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalResponses, setModalResponses] = useState<KeywordResponseDetail[]>([]);
  const keywordLv = useListView(data?.keyword_breakdown ?? [], {
    size: 15,
    search: (k, q) => k.keyword.toLowerCase().includes(q),
  });
  const compLv = useListView(data?.competitor_breakdown ?? [], {
    size: 15,
    search: (c, q) => c.domain.toLowerCase().includes(q),
  });

  const load = async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set('tenantId', String(tenantId));
      params.set('days', String(days));
      if (scope && scope !== 'all') params.set('scope', scope);
      const res = await fetch(`/api/admin/citations?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (seq !== reqSeq.current) return; // stale 응답 무시 (scope 전환 race 방지)
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'fetch failed');
      setData(json);
    } catch (e) {
      if (seq === reqSeq.current) setError((e as Error).message);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, days, scope]);

  // 헤더 언어 스코프 구독 → scope 변경 시 재요청.
  useEffect(() => {
    setScope(readScope());
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') setScope(detail);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);

  const totalMentions = useMemo(
    () => (data ? data.mention_trend.reduce((s, d) => s + d.count, 0) : 0),
    [data]
  );
  const totalSources = data?.source_tier.total ?? 0;
  const medimapShare =
    totalSources > 0 && data
      ? Math.round((data.source_tier.T1 / totalSources) * 1000) / 10
      : 0;
  const clientShare =
    totalSources > 0 && data
      ? Math.round((data.source_tier.T2 / totalSources) * 1000) / 10
      : 0;

  const tierPieData = data
    ? (['T1', 'T2', 'T3', 'T4', 'T5'] as const)
        .map((k) => ({
          name: TIER_LABELS[k].label,
          value: data.source_tier[k],
          color: TIER_LABELS[k].color,
        }))
        .filter((d) => d.value > 0)
    : [];

  const tenants = data?.tenants ?? [];
  const selectedName = data?.selected_tenant?.name ?? '전체 클라이언트';
  const filteredTenants = tenants.filter((t) =>
    !tenantSearch || t.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const openKeywordModal = async (keyword: string) => {
    setModalKeyword(keyword);
    setModalLoading(true);
    setModalResponses([]);
    try {
      const url = tenantId
        ? `/api/admin/citations/keyword?keyword=${encodeURIComponent(keyword)}&tenantId=${tenantId}`
        : `/api/admin/citations/keyword?keyword=${encodeURIComponent(keyword)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.ok) setModalResponses(json.responses ?? []);
    } catch {
      // graceful
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="px-8 py-6 print:px-0 print:py-0">
      <header className="admin-page-header print:hidden">
        <div>
          <h1 className="admin-page-title">AI 인용 추적 — 자사</h1>
          <p className="admin-page-desc">최근 30일간 AI 가 우리 콘텐츠를 인용한 횟수와 키워드별 효과를 분석합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface-base p-0.5 print:hidden">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold transition',
                  days === d ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-subtle'
                )}
              >
                {d}일
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} className="btn-secondary text-xs">
            <Printer className="h-3.5 w-3.5" /> PDF 출력
          </button>
          <button onClick={() => void load()} className="btn-secondary text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> 새로고침
          </button>
        </div>
      </header>

      <CitationsTabs />

      {/* 프린트 헤더 (PDF 출력 시만 표시) */}
      <div className="hidden print:mb-6 print:block">
        <h1 className="text-2xl font-bold text-ink">AI 인용 추적 — {selectedName}</h1>
        <p className="mt-1 text-xs text-ink-muted">
          WECIRCLE GEO · {new Date().toLocaleString('ko-KR')} · 최근 30일 기준
        </p>
      </div>

      {/* === 클라이언트 selector — 드롭다운 + 검색 === */}
      <section className="card mb-5 p-4 print:hidden">
        <div className="mb-2 text-xs font-semibold text-ink-muted">클라이언트 선택</div>
        <div className="relative max-w-md">
          <button
            type="button"
            onClick={() => setTenantDropdownOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-base px-3 py-2 text-sm transition hover:border-border-strong"
          >
            <span className="font-semibold text-ink">{selectedName}</span>
            <ChevronDown className="h-4 w-4 text-ink-muted" />
          </button>
          {tenantDropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-surface-base shadow-lg">
              <div className="sticky top-0 border-b border-border bg-surface-base p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="병원명 검색…"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-subtle py-1.5 pl-7 pr-2 text-xs focus:border-ink focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <ul className="py-1">
                <li>
                  <button
                    onClick={() => {
                      setTenantId(null);
                      setTenantDropdownOpen(false);
                      setTenantSearch('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-surface-subtle',
                      tenantId === null && 'bg-surface-muted font-semibold text-ink-soft'
                    )}
                  >
                    <span>전체 보기</span>
                    <span className="text-[10px] text-ink-muted">{tenants.length}개 통합</span>
                  </button>
                </li>
                {filteredTenants.length === 0 && (
                  <li className="px-3 py-2 text-xs text-ink-muted">검색 결과 없음</li>
                )}
                {filteredTenants.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setTenantId(t.id);
                        setTenantDropdownOpen(false);
                        setTenantSearch('');
                      }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-surface-subtle',
                        tenantId === t.id && 'bg-surface-muted font-semibold text-ink-soft'
                      )}
                    >
                      <span>{t.name}</span>
                      {t.is_self && <span className="text-[10px]">⭐ 자사</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-3 text-[11px] text-ink-muted">
          현재 선택: <strong className="text-ink">{selectedName}</strong> · 최근 {days}일 기준 ·
          총 {tenants.length}개 병원
        </div>
      </section>

      {loading ? (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 데이터 로드 중…
        </div>
      ) : error || !data ? (
        <div className="card border-status-danger/30 bg-status-dangerSoft/30 px-6 py-4 text-sm text-status-danger">
          데이터 로드 실패: {error}
        </div>
      ) : (
        <>
          {/* === KPI 카드 4개 — 의미 명확한 한국어 === */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card card-pad">
              <div className="kpi-label">AI 추천 언급</div>
              <div className="mt-2 kpi-value text-ink-soft">{totalMentions}<span className="ml-1 text-base">건</span></div>
              <div className="text-[11px] text-ink-muted">{selectedName} 가 AI 응답에 직접 언급된 횟수 (30일)</div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">인용 출처 도메인</div>
              <div className="mt-2 kpi-value text-ink">{totalSources}<span className="ml-1 text-base">개</span></div>
              <div className="text-[11px] text-ink-muted">AI 가 정보 출처로 사용한 사이트 총합</div>
            </div>
            <div className="card card-pad border-border">
              <div className="kpi-label">위서클 콘텐츠 인용률 ⭐</div>
              <div className="mt-2 kpi-value text-ink-soft">{medimapShare}%</div>
              <div className="text-[11px] text-ink-muted">
                {data.source_tier.T1} / {totalSources} — 위서클이 발행한 글이 AI 출처로 사용됨
              </div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">병원 홈페이지 노출률</div>
              <div className="mt-2 kpi-value text-accent">{clientShare}%</div>
              <div className="text-[11px] text-ink-muted">
                {data.source_tier.T2} / {totalSources} — 병원 자체 사이트가 AI 출처에 등장
              </div>
            </div>
          </section>

          {/* === 차트 4개 === */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="30일 Mention Trend">
              {totalMentions === 0 ? (
                <EmptyState text="아직 데이터 없음" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.mention_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                    <XAxis dataKey="date" fontSize={10} stroke="#64748B" />
                    <YAxis fontSize={10} stroke="#64748B" allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Mention" stroke="#15B8A6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Source 5-Tier 분포">
              {tierPieData.length === 0 ? (
                <EmptyState text="아직 source 데이터 없음" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={tierPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      label={(e: { value: number }) => `${e.value}`}
                      labelLine={false}
                    >
                      {tierPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Top 10 Source Domain">
              {data.top_domains.length === 0 ? (
                <EmptyState text="아직 source 데이터 없음" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.top_domains} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                    <XAxis type="number" fontSize={10} stroke="#64748B" allowDecimals={false} />
                    <YAxis type="category" dataKey="domain" stroke="#64748B" width={150} interval={0} tick={<DomainTick />} />
                    <Tooltip />
                    <Bar dataKey="count" name="Count">
                      {data.top_domains.map((d, i) => (
                        <Cell key={i} fill={TIER_LABELS[d.tier]?.color ?? '#94A3B8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="위서클 Source Share Trend ⭐" subtitle="(SaaS 직접 ROI)" border="brand">
              {data.medimap_share_trend.every((d) => d.share_pct === 0) ? (
                <div className="flex h-60 flex-col items-center justify-center text-sm text-ink-muted">
                  <div>현재 위서클 콘텐츠 source share = 0%</div>
                  <div className="mt-1 text-[11px] text-ink-faint">3~6개월 콘텐츠 누적 후 점진 증가 예상</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.medimap_share_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                    <XAxis dataKey="date" fontSize={10} stroke="#64748B" />
                    <YAxis fontSize={10} stroke="#64748B" tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="share_pct" name="위서클 share" stroke="#15B8A6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          {/* === 세부 데이터 === */}
          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 키워드별 분석 */}
            <div className="card">
              <header className="border-b border-border px-5 py-3">
                <h2 className="section-title">키워드별 인용 분석</h2>
                <div className="mt-1 text-[11px] text-ink-muted">
                  {selectedName} 의 키워드별 mention + source 카운트
                </div>
              </header>
              {data.keyword_breakdown.length > 0 && (
                <div className="px-5 pt-3">
                  <SearchBox lv={keywordLv} placeholder="키워드 검색" />
                </div>
              )}
              {data.keyword_breakdown.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-ink-muted">
                  아직 측정된 키워드 없음
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">키워드</th>
                        <th className="px-2 py-2 text-right">Mention</th>
                        <th className="px-2 py-2 text-right">Source</th>
                        <th className="px-2 py-2 text-right text-ink-soft">위서클</th>
                        <th className="px-2 py-2 text-right text-accent">자체</th>
                        <th className="px-2 py-2 text-right text-ink-muted">경쟁</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordLv.view.map((k, i) => (
                        <tr
                          key={i}
                          className="cursor-pointer border-t border-border hover:bg-surface-muted/60"
                          onClick={() => void openKeywordModal(k.keyword)}
                          title="클릭하면 AI 응답 상세 보기"
                        >
                          <td className="px-3 py-2 font-semibold text-ink hover:text-ink">
                            {k.keyword} <span className="text-[9px] text-ink-faint">▸</span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono">{k.mention_count}</td>
                          <td className="px-2 py-2 text-right font-mono">{k.source_count}</td>
                          <td className="px-2 py-2 text-right font-mono text-ink-soft">{k.t1}</td>
                          <td className="px-2 py-2 text-right font-mono text-accent">{k.t2}</td>
                          <td className="px-2 py-2 text-right font-mono text-ink-muted">{k.t5}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {keywordLv.total > 0 && (
                <div className="px-5 pb-4">
                  <PageBar lv={keywordLv} />
                </div>
              )}
            </div>

            {/* 경쟁사/플랫폼 도메인 분석 — URL drill-down */}
            <div className="card">
              <header className="border-b border-border px-5 py-3">
                <h2 className="section-title">경쟁사/플랫폼 도메인 분석</h2>
                <div className="mt-1 text-[11px] text-ink-muted">
                  AI 가 정보 출처로 사용한 사이트 — <strong>행 클릭</strong>으로 실제 인용 URL 펼치기
                </div>
                {/* Round 103 (2026-06-29) — 3엔진 웹검색 활성화: Gemini(grounding) +
                    Claude(web_search_20250305 강제) + OpenAI(search-preview) 모두 source URL 수집.
                    엔진별 검색률 차이로 도메인 채움률은 Gemini>Claude>OpenAI 순. 누적 진행 중. */}
                <div className="mt-2 rounded-md border border-status-warning/30 bg-status-warning/5 px-3 py-2 text-[11px] text-ink-soft">
                  ⓘ <strong>3개 엔진 모두 도메인 인용 집계</strong> — Gemini(grounding) · Claude(웹검색 도구) ·
                  OpenAI(search-preview)에서 source URL 을 수집합니다. 엔진별 웹검색 빈도 차이로 도메인
                  채움률은 다를 수 있으며(Gemini 가 가장 높음), 매일 KST 07:00 cron 으로 누적됩니다.
                </div>
              </header>
              {data.competitor_breakdown.length > 0 && (
                <div className="px-5 pt-3">
                  <SearchBox lv={compLv} placeholder="도메인 검색" />
                </div>
              )}
              {data.competitor_breakdown.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-ink-muted">
                  아직 측정된 출처 없음
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="w-8 px-2 py-2"></th>
                        <th className="px-3 py-2 text-left">도메인</th>
                        <th className="px-2 py-2 text-left">Tier</th>
                        <th className="px-2 py-2 text-right">횟수</th>
                        <th className="px-3 py-2 text-left">인용된 키워드</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compLv.view.map((c, i) => {
                        const isOpen = expandedDomain === c.domain;
                        return (
                          <>
                            <tr
                              key={`${c.domain}-${i}`}
                              className="cursor-pointer border-t border-border hover:bg-surface-subtle"
                              onClick={() => setExpandedDomain(isOpen ? null : c.domain)}
                            >
                              <td className="px-2 py-2 text-ink-muted">
                                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </td>
                              <td className="px-3 py-2 font-mono text-ink">
                                <DomainLink domain={c.domain} className="text-ink-soft hover:underline" />
                              </td>
                              <td className="px-2 py-2">
                                <span
                                  className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{
                                    backgroundColor: `${TIER_LABELS[c.tier]?.color}20`,
                                    color: TIER_LABELS[c.tier]?.color ?? '#64748B',
                                  }}
                                >
                                  {TIER_LABELS[c.tier]?.short ?? c.tier}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right font-mono">{c.count}</td>
                              <td className="px-3 py-2">
                                <div className="line-clamp-2 text-[11px] text-ink-soft">{c.keywords.join(', ')}</div>
                              </td>
                            </tr>
                            {isOpen && (
                              <tr key={`${c.domain}-expand`} className="bg-surface-muted/60">
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="mb-2 text-[11px] font-semibold text-ink-muted">
                                    키워드별 인용 상세 ({c.citations.length}개 키워드) — 어떤 키워드로 · 몇 번 · 어느 AI · 어떤 콘텐츠
                                  </div>
                                  <CitationBreakdown citations={c.citations} />
                                  <div className="mt-2 text-[10px] text-ink-muted">
                                    💡 <strong>학습 포인트</strong> — 위 URL 의 페이지 구조 (제목 패턴, FAQ schema,
                                    글 길이) 를 분석해 위서클 콘텐츠 가이드에 반영
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {compLv.total > 0 && (
                <div className="px-5 pb-4">
                  <PageBar lv={compLv} />
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* === 키워드 클릭 → AI 응답 상세 modal === */}
      {modalKeyword && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4 print:hidden"
          onClick={() => setModalKeyword(null)}
        >
          <div
            className="card max-h-[88vh] w-full max-w-4xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-base px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  키워드: <span className="text-ink-soft">{modalKeyword}</span>
                </h3>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  최근 30일 AI 응답 raw 데이터 (영업 시연용)
                </p>
              </div>
              <button
                onClick={() => setModalKeyword(null)}
                className="rounded-md p-1 text-ink-muted hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-ink-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 응답 데이터 로드 중…
                </div>
              ) : modalResponses.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink-muted">
                  이 키워드의 측정 데이터 없음
                </div>
              ) : (
                <div className="space-y-5">
                  {modalResponses.map((r, i) => (
                    <div key={r.response_id} className="rounded-lg border border-border p-4">
                      <div className="mb-2 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-ink/5 px-2 py-0.5 font-bold text-ink-soft">
                            {r.engine}
                          </span>
                          <span className="font-semibold text-ink">{r.tenant_name}</span>
                          <span className="text-ink-muted">
                            {new Date(r.created_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <span className="font-mono text-ink-faint">#{i + 1}</span>
                      </div>

                      {/* AI 응답 raw text */}
                      <div className="mb-3 rounded-md bg-surface-subtle px-4 py-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          AI 응답 (raw)
                        </div>
                        <div className="whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                          {r.raw_text || '(응답 없음)'}
                        </div>
                      </div>

                      {/* Mention 추출 결과 */}
                      {r.mentions.length > 0 && (
                        <div className="mb-3">
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                            추출된 언급 ({r.mentions.length}건)
                          </div>
                          <ul className="space-y-1.5">
                            {r.mentions.map((m, mi) => (
                              <li key={mi} className="rounded bg-surface-muted/60 px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'rounded px-1.5 py-0.5 text-[10px] font-bold',
                                      m.is_target
                                        ? 'bg-ink text-white'
                                        : 'bg-ink-muted/20 text-ink-muted'
                                    )}
                                  >
                                    {m.is_target ? '자사' : '경쟁사'}
                                  </span>
                                  <span className="font-semibold text-ink">{m.brand}</span>
                                  <span className="text-[10px] font-mono text-ink-muted">
                                    weight {m.weight.toFixed(2)}
                                  </span>
                                </div>
                                <div className="mt-1 text-ink-soft">{m.context_snippet}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Citation source URLs */}
                      {r.source_domains.length > 0 && (
                        <div>
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                            인용 출처 ({r.source_domains.length}개)
                          </div>
                          <ul className="space-y-1">
                            {r.source_domains.slice(0, 10).map((sd, si) => (
                              <li key={si} className="flex items-start gap-2 text-[11px]">
                                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-ink-soft" />
                                <a
                                  href={sd.final_url ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-ink underline decoration-dotted hover:text-ink"
                                >
                                  <span className="font-mono">{sd.domain}</span>
                                  {sd.final_url && (
                                    <span className="ml-1 text-ink-muted">
                                      — {decodeURIComponent(sd.final_url).slice(0, 80)}
                                      {sd.final_url.length > 80 && '…'}
                                    </span>
                                  )}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  border,
  children,
}: {
  title: string;
  subtitle?: string;
  border?: 'brand';
  children: React.ReactNode;
}) {
  return (
    <div className={cn('card card-pad', border === 'brand' && 'border-border')}>
      <h2 className="section-title mb-3">
        {title}
        {subtitle && <span className="ml-2 text-[11px] font-normal text-ink-muted">{subtitle}</span>}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex h-60 items-center justify-center text-sm text-ink-muted">{text}</div>;
}
