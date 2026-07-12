/**
 * Round 34 (2026-05-30) — 경쟁사 현황 분석 페이지.
 *
 * 자사 페이지의 mirror — 단 view 가 경쟁사 중심:
 *   - 비즈니스 모델 키워드 표시 (tenant.business_model)
 *   - 경쟁사 도메인 top 10 (자사/클라이언트 자체 제외)
 *   - 키워드별 경쟁사 매트릭스 (어느 경쟁사가 어느 키워드에서 노출)
 *   - URL drill-down (실제 인용 페이지 확인)
 *
 * 향후 (Round 35): tenant.business_model 의 generic 키워드로 별도 측정 batch
 */
'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { readScope, SCOPE_EVENT } from '@/components/admin/ScopeSelector';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LearnFromDomainButton } from '@/components/admin/LearnFromDomainButton';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { CitationsTabs } from '@/components/admin/CitationsTabs';
import { CitationBreakdown, EngineChip, DomainTick, DomainLink, type Citation } from '@/components/admin/CitationBreakdown';
import { TrendAnalysisCard } from '@/components/admin/TrendAnalysisCard';

type TenantOption = { id: number; name: string; is_self: boolean };
type SelectedTenant = TenantOption & { business_model: string };

type CompetitorData = {
  tenants: TenantOption[];
  selected_tenant: SelectedTenant | null;
  business_model: string;
  competitor_top: Array<{
    domain: string;
    tier: string;
    count: number;
    keywords: string[];
    urls: string[];
    citations: Citation[];
  }>;
  keyword_competitor_matrix: Array<{
    keyword: string;
    total_sources: number;
    competitors: Array<{ domain: string; count: number; tier: string }>;
    engines: Array<{ engine: string; count: number }>;
  }>;
  tier_distribution: { T3: number; T4: number; T5: number };
  client_status: { medimap_t1: number; client_t2: number; total_sources: number; keywords: string[] };
};

// Round 52 fix (2026-05-31) — 라벨 산업 종속 제거. 안과 외 클라이언트(모발이식·피부·한방) 도 동일 적용.
// Round 124-D — 통일 팔레트 (citations/dashboard 와 동기화: 골드·아이리스·페리윙클)
const TIER_LABELS: Record<string, { label: string; color: string; short: string }> = {
  T3: { label: '권위/공식 사이트', color: '#E8A33D', short: '권위' },
  T4: { label: '의료 플랫폼', color: '#7C3AED', short: '플랫폼' },
  T5: { label: '동종업계 경쟁사', color: '#818CF8', short: '경쟁' },
};

// Round 52 fix — business_model 에서 진료과목 키워드 추출 → "경쟁 모발이식 병원" 식으로 라벨 동적화.
function extractCategoryLabel(businessModel: string | null | undefined): string {
  if (!businessModel) return '동종업계 경쟁사';
  const bm = businessModel.toLowerCase();
  if (bm.includes('모발이식') || bm.includes('fue') || bm.includes('fut') || bm.includes('hair')) return '경쟁 모발이식 병원';
  if (bm.includes('안과') || bm.includes('라식') || bm.includes('라섹') || bm.includes('백내장')) return '경쟁 안과';
  if (bm.includes('피부') || bm.includes('피부과') || bm.includes('레이저')) return '경쟁 피부과';
  if (bm.includes('성형')) return '경쟁 성형외과';
  if (bm.includes('치과') || bm.includes('임플란트')) return '경쟁 치과';
  if (bm.includes('한방') || bm.includes('한의원')) return '경쟁 한의원';
  if (bm.includes('정형') || bm.includes('척추')) return '경쟁 정형외과';
  if (bm.includes('산부인과') || bm.includes('여성')) return '경쟁 산부인과';
  return '동종업계 경쟁사';
}

export default function CompetitorsPage() {
  // Round 34 phase 5 (2026-05-30): URL query 로 tenantId 공유.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTenantId = (() => {
    const v = searchParams.get('tenantId');
    return v ? Number(v) || null : null;
  })();
  const [tenantId, setTenantIdState] = useState<number | null>(initialTenantId);
  const setTenantId = (id: number | null) => {
    setTenantIdState(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id == null) params.delete('tenantId');
    else params.set('tenantId', String(id));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const [data, setData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  // Round 42 B — label 필터 (DIRECT/INDIRECT/REFERENCE/TO_LEARN/IGNORE)
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  // Round 75 — 기간 필터 (일수)
  const [days, setDays] = useState(30);
  // 언어 스코프 (헤더 ScopeSelector 동기화) + race 가드 seq
  const [scope, setScope] = useState('all');
  const reqSeq = useRef(0);

  const load = async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    try {
      // Round 42 B — label 필터 지원 (?label=DIRECT|INDIRECT|REFERENCE|TO_LEARN|IGNORE)
      const params = new URLSearchParams();
      if (tenantId) params.set('tenantId', String(tenantId));
      if (labelFilter) params.set('label', labelFilter);
      params.set('days', String(days));
      if (scope && scope !== 'all') params.set('scope', scope);
      const url = `/api/admin/competitors${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
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
  }, [tenantId, labelFilter, days, scope]);

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

  const tenants = data?.tenants ?? [];
  const selectedName = data?.selected_tenant?.name ?? '전체 클라이언트';
  const businessModel = data?.business_model ?? '';
  const filteredTenants = tenants.filter(
    (t) => !tenantSearch || t.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const totalCompetitorSources = data
    ? data.tier_distribution.T3 + data.tier_distribution.T4 + data.tier_distribution.T5
    : 0;

  // Round 70 — 클라이언트(선택 tenant) 인용 횟수를 경쟁사 순위에 삽입 (강조 행).
  const detailRows = (() => {
    if (!data) return [] as Array<CompetitorData['competitor_top'][number] & { _client: boolean }>;
    const base = data.competitor_top.map((c) => ({ ...c, _client: false }));
    if (data.selected_tenant && !data.selected_tenant.is_self) {
      const clientRow = {
        domain: data.selected_tenant.name,
        tier: 'T2',
        count: data.client_status.client_t2,
        keywords: data.client_status.keywords ?? [],
        urls: [] as string[],
        citations: [] as Citation[],
        _client: true,
      };
      return [...base, clientRow].sort((a, b) => b.count - a.count);
    }
    return base;
  })();

  return (
    <div className="px-8 py-6 print:px-0 print:py-0">
      <header className="admin-page-header print:hidden">
        <div>
          <h1 className="admin-page-title">AI 인용 추적 — 경쟁사</h1>
          <p className="admin-page-desc">AI 가 우리 클라이언트와 함께 추천하는 경쟁 의료기관을 추적합니다. 행 클릭 시 실제 인용 URL 확인</p>
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

      <div className="hidden print:mb-6 print:block">
        <h1 className="text-2xl font-bold text-ink">경쟁사 현황 — {selectedName}</h1>
        <p className="mt-1 text-xs text-ink-muted">
          WECIRCLE GEO · {new Date().toLocaleString('ko-KR')} · 비즈니스 모델: {businessModel}
        </p>
      </div>

      {/* === 클라이언트 selector === */}
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
        {businessModel && (
          <div className="mt-3 rounded-md bg-surface-muted/60 px-3 py-2 text-[11px]">
            <span className="font-semibold text-ink">비즈니스 모델:</span>{' '}
            <span className="text-ink-soft">{businessModel}</span>
            <div className="mt-1 text-[10px] text-ink-muted">
              ℹ️ 경쟁사 측정 — 매일 KST 07:00 자동 측정
            </div>
          </div>
        )}
        <div className="mt-2 text-[11px] text-ink-muted">
          현재 선택: <strong className="text-ink">{selectedName}</strong> · 최근 {days}일 기준
        </div>
      </section>

      {loading ? (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
        </div>
      ) : error || !data ? (
        <div className="card border-status-danger/30 bg-status-dangerSoft/30 px-6 py-4 text-sm text-status-danger">
          데이터 로드 실패: {error}
        </div>
      ) : (
        <>
          {/* Round 67 — 경쟁사 측정 데이터 없을 때 안내 (위서클/자사 혼동 방지) */}
          {data.competitor_top.length === 0 && (
            <div className="mb-6 card card-pad border-l-4 border-l-status-warning">
              <div className="text-sm font-semibold text-ink">이 클라이언트는 아직 경쟁사 측정 데이터가 없습니다</div>
              <div className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                이 페이지는 <strong>경쟁사 추적용(competitor_landscape) 키워드</strong>만 집계합니다.{' '}
                {data.selected_tenant?.business_model === 'self'
                  ? '위서클(자사)은 자사 키워드로 추적되므로, 상단 ‘자사 인용’ 탭에서 경쟁/점유 데이터를 확인하세요.'
                  : '이 병원에 competitor_landscape 키워드를 등록하면 채워집니다. 자사 키워드 기반 데이터는 ‘자사 인용’ 탭에 있습니다.'}
              </div>
            </div>
          )}

          {/* === Round 51 (2026-05-31) — 이번 주 인사이트 박스: 위협 / 학습 후보 / 액션 === */}
          {data.competitor_top.length > 0 && (
            <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* 1. 위협 — top 3 경쟁사 (T5 우선) */}
              <div className="card card-pad border-l-4 border-l-status-danger">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-status-danger">
                  <span>🚨 위협 도메인 Top 3</span>
                </div>
                {(() => {
                  // T5 (직접 경쟁) 우선, 없으면 전체 top
                  const t5 = data.competitor_top.filter((c) => c.tier === 'T5').slice(0, 3);
                  const top3 = t5.length > 0 ? t5 : data.competitor_top.slice(0, 3);
                  return top3.length === 0 ? (
                    <div className="text-[11px] text-ink-muted">아직 위협 도메인 없음</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {top3.map((c, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
                          <DomainLink domain={c.domain} className="truncate font-mono text-ink hover:text-ink hover:underline" />
                          <span className="shrink-0 rounded bg-status-dangerSoft px-1.5 py-0.5 font-bold text-status-danger">
                            ×{c.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                <div className="mt-2 text-[10px] text-ink-muted">AI 가 우리보다 자주 추천하는 경쟁사</div>
              </div>

              {/* 2. 학습 후보 — 인용 횟수 많은데 위서클 baseline 에 없는 도메인 (T3 = 권위) */}
              <div className="card card-pad border-l-4 border-l-status-warning">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-status-warning">
                  <span>📚 학습 후보 Top 3</span>
                </div>
                {(() => {
                  // T3 (권위 사이트) — 우리도 인용되도록 콘텐츠 톤 학습 대상
                  const t3 = data.competitor_top.filter((c) => c.tier === 'T3').slice(0, 3);
                  return t3.length === 0 ? (
                    <div className="text-[11px] text-ink-muted">권위 사이트 데이터 부족</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {t3.map((c, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
                          <DomainLink domain={c.domain} className="truncate font-mono text-ink hover:text-ink hover:underline" />
                          <span className="shrink-0 rounded bg-status-warningSoft px-1.5 py-0.5 font-bold text-status-warning">
                            ×{c.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                <div className="mt-2 text-[10px] text-ink-muted">아래 표에서 행 클릭 → Learn 버튼으로 학습</div>
              </div>

              {/* 3. 액션 — 이번 주 권장 액션 */}
              <div className="card card-pad border-l-4 border-l-ink">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  <span>✅ 이번 주 액션</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-ink-soft">
                  {data.tier_distribution.T5 > 5 && (
                    <li>• T5 ({extractCategoryLabel(businessModel)}) {data.tier_distribution.T5}건 → DIRECT 라벨링</li>
                  )}
                  {data.tier_distribution.T3 > 0 && (
                    <li>• 권위 사이트 인용 패턴 학습 → 콘텐츠 인용성 향상</li>
                  )}
                  {data.keyword_competitor_matrix.length > 0 && (
                    <li>• 매트릭스 표에서 우리가 1위인 키워드 사수, 2위 키워드 보강</li>
                  )}
                  {data.competitor_top.length === 0 && (
                    <li className="text-ink-muted">측정 데이터 부족 — 키워드 활성화 확인 필요</li>
                  )}
                </ul>
                <div className="mt-2 text-[10px] text-ink-muted">매일 KST 07:00 자동 측정 기준</div>
              </div>
            </section>
          )}

          {/* === KPI 카드 4개 === */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card card-pad">
              <div className="kpi-label">경쟁사 출처 총합</div>
              <div className="mt-2 kpi-value text-ink">{totalCompetitorSources}<span className="ml-1 text-base">개</span></div>
              <div className="text-[11px] text-ink-muted">AI 가 사용한 비-자사 출처</div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">권위 사이트</div>
              <div className="mt-2 kpi-value" style={{ color: TIER_LABELS.T3.color }}>
                {data.tier_distribution.T3}
              </div>
              <div className="text-[11px] text-ink-muted">종합병원·학회·의료매체</div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">의료 플랫폼</div>
              <div className="mt-2 kpi-value" style={{ color: TIER_LABELS.T4.color }}>
                {data.tier_distribution.T4}
              </div>
              <div className="text-[11px] text-ink-muted">모두닥·강남언니·하이닥 등</div>
            </div>
            <div className="card card-pad border-ink/20">
              <div className="kpi-label">{extractCategoryLabel(businessModel)} ⚠️</div>
              <div className="mt-2 kpi-value text-ink">{data.tier_distribution.T5}</div>
              <div className="text-[11px] text-ink-muted">따라잡을 직접 경쟁사</div>
            </div>
          </section>

          {/* === Round 65 — 추이 분석 (경쟁사 차트 바로 위) === */}
          <TrendAnalysisCard tenantId={tenantId} days={days} />

          {/* === Top 경쟁사 도메인 차트 + 우리 현황 (Round 66) === */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="card card-pad lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="section-title">경쟁사 도메인 Top 10</h2>
              <span className="text-[10px] text-ink-muted">막대 위에 마우스 → 상세 · 아래 표에서 행 클릭 → 인용 드릴다운</span>
            </div>
            {data.competitor_top.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-ink-muted">
                아직 경쟁사 출처 데이터 없음
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.min(300, Math.max(150, data.competitor_top.slice(0, 10).length * 26))}
              >
                <BarChart
                  data={data.competitor_top.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" horizontal={false} />
                  <XAxis type="number" fontSize={10} stroke="#64748B" allowDecimals={false} />
                  <YAxis type="category" dataKey="domain" stroke="#64748B" width={150} interval={0} tick={<DomainTick />} />
                  <Tooltip cursor={{ fill: '#7C3AED0F' }} content={<CompetitorBarTooltip />} />
                  <Bar dataKey="count" name="인용 횟수" maxBarSize={16} radius={[0, 3, 3, 0]}>
                    {data.competitor_top.slice(0, 10).map((d, i) => (
                      <Cell key={i} fill={TIER_LABELS[d.tier]?.color ?? '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Round 66 — 우리(자사) 현황 패널 (경쟁사 Top10 옆) */}
          <aside className="card card-pad">
            <h3 className="section-title mb-1">내 점유 현황</h3>
            <p className="mb-3 text-[11px] text-ink-muted">
              AI가 답변에 인용한 출처 중 <strong className="text-ink-soft">우리 편</strong>(위서클이 쓴 글 + 병원 사이트)이 차지하는 비율
            </p>
            {(() => {
              const cs = data.client_status;
              const medimap = cs.medimap_t1;
              const client = cs.client_t2;
              const ours = medimap + client;
              const comp = data.tier_distribution.T3 + data.tier_distribution.T4 + data.tier_distribution.T5;
              const total = ours + comp;
              const sharePct = total > 0 ? Math.round((ours / total) * 1000) / 10 : 0;
              return (
                <div className="space-y-3">
                  {/* 큰 점유율 + 우리 vs 경쟁사 스택 바 */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-ink-soft">{sharePct}%</span>
                      <span className="text-[11px] text-ink-muted">우리 점유율</span>
                    </div>
                    <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-surface-subtle">
                      <div className="h-full bg-ink" style={{ width: `${Math.min(100, sharePct)}%` }} />
                      <div className="h-full flex-1 bg-ink-muted/30" />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px]">
                      <span className="font-semibold text-ink-soft">우리 {ours}회</span>
                      <span className="text-ink-muted">경쟁사 {comp}회 · 전체 {total}회</span>
                    </div>
                  </div>
                  {/* 분해: 위서클 글 / 병원 사이트 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink">위서클 GEO 콘텐츠 ⭐</div>
                        <div className="text-[10px] text-ink-muted">우리가 발행한 글이 AI에 인용된 횟수</div>
                      </div>
                      <span className="shrink-0 text-xl font-bold text-ink-soft">{medimap}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-surface-subtle px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink">병원 홈페이지</div>
                        <div className="text-[10px] text-ink-muted">병원 자체 사이트가 AI에 인용된 횟수</div>
                      </div>
                      <span className="shrink-0 text-xl font-bold text-accent">{client}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-muted/60 px-3 py-2 text-[10px] leading-relaxed text-ink-soft">
                    💡 이 숫자가 오를수록 AI가 우리를 더 자주 추천한다는 뜻입니다. 왼쪽 <strong>경쟁사 Top10</strong> 막대와 비교해보세요.
                  </div>
                </div>
              );
            })()}
          </aside>
          </div>

          {/* === 키워드별 경쟁사 매트릭스 === */}
          <section className="mb-6 card">
            <header className="border-b border-border px-5 py-3">
              <h2 className="section-title">키워드별 경쟁사 매트릭스</h2>
              <div className="mt-1 text-[11px] text-ink-muted">
                각 키워드에 대해 AI 가 어떤 경쟁사를 더 많이 추천하는지 (top 5)
              </div>
            </header>
            {data.keyword_competitor_matrix.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-muted">
                아직 키워드별 경쟁사 데이터 없음
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">키워드</th>
                      <th className="px-2 py-2 text-right">총 출처</th>
                      <th className="px-3 py-2 text-left">Top 경쟁사 (인용 횟수)</th>
                      <th className="px-3 py-2 text-left">AI 엔진별 인용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keyword_competitor_matrix.map((m, i) => (
                      <tr key={i} className="border-t border-border hover:bg-surface-subtle">
                        <td className="px-3 py-2 font-semibold text-ink">{m.keyword}</td>
                        <td className="px-2 py-2 text-right font-mono">{m.total_sources}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {m.competitors.map((c, ci) => (
                              <span
                                key={ci}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px]"
                                style={{
                                  backgroundColor: `${TIER_LABELS[c.tier]?.color}20`,
                                  color: TIER_LABELS[c.tier]?.color ?? '#64748B',
                                }}
                              >
                                {c.domain} <strong>×{c.count}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {m.engines.length === 0 ? (
                              <span className="text-[10px] text-ink-faint">—</span>
                            ) : (
                              m.engines.map((e) => (
                                <EngineChip key={e.engine} engine={e.engine} count={e.count} />
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* === 경쟁사 도메인 상세 + URL drill-down === */}
          <section className="card">
            <header className="border-b border-border px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title">경쟁사 도메인 상세</h2>
                {/* Round 42 B — 라벨 필터 토글 (tenantId 있을 때만) */}
                {tenantId && (
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="text-ink-muted">라벨:</span>
                    {[
                      { key: null, label: '전체', color: 'bg-surface-base text-ink-soft border-border' },
                      { key: 'DIRECT', label: '직접 경쟁', color: 'bg-status-danger text-white border-status-danger' },
                      { key: 'INDIRECT', label: '간접', color: 'bg-status-warning text-white border-status-warning' },
                      { key: 'REFERENCE', label: '정보 출처', color: 'bg-status-success text-white border-status-success' },
                      { key: 'TO_LEARN', label: '분석 대상', color: 'bg-ink text-white border-ink' },
                      { key: 'IGNORE', label: '무시', color: 'bg-ink-muted text-white border-ink-muted' },
                    ].map((opt) => (
                      <button
                        key={opt.key ?? 'all'}
                        type="button"
                        onClick={() => setLabelFilter(opt.key)}
                        className={cn(
                          'rounded border px-1.5 py-0.5 font-semibold transition',
                          labelFilter === opt.key
                            ? opt.color
                            : 'border-border bg-surface-base text-ink-soft hover:bg-surface-soft'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-1 text-[11px] text-ink-muted">
                <strong>행 클릭</strong>으로 실제 인용 URL 펼치기. 클라이언트 선택 시 라벨 토글로 우선순위 도메인만 표시 가능
              </div>
            </header>
            {data.competitor_top.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-muted">데이터 없음</div>
            ) : (
              <>
              {/* Round 52 (2026-05-31) — 데스크탑 표 (md 이상) */}
              <div className="hidden overflow-x-auto md:block">
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
                    {detailRows.map((c, i) => {
                      // Round 70 — 우리 병원(클라이언트) 강조 행 (순위 위치에 삽입)
                      if (c._client) {
                        return (
                          <tr key={`client-${i}`} className="border-y-2 border-ink bg-surface-muted/70">
                            <td className="px-2 py-2"></td>
                            <td className="px-3 py-2">
                              <span className="font-semibold text-ink-soft">⭐ {c.domain}</span>
                              <span className="ml-1.5 rounded bg-ink px-1.5 py-0.5 text-[9px] font-bold text-white">우리 병원</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="inline-flex rounded-md bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold text-ink-soft">자사</span>
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold text-ink-soft">{c.count}</td>
                            <td className="px-3 py-2">
                              <div className="line-clamp-2 text-[11px] text-ink">
                                {c.keywords.length > 0 ? c.keywords.join(', ') : '인용된 키워드 없음'}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      const isOpen = expandedDomain === c.domain;
                      return (
                        <Fragment key={`${c.domain}-${i}`}>
                          <tr
                            className="cursor-pointer border-t border-border hover:bg-surface-subtle"
                            onClick={() => setExpandedDomain(isOpen ? null : c.domain)}
                          >
                            <td className="px-2 py-2 text-ink-muted">
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              <DomainLink domain={c.domain} className="text-ink hover:text-ink hover:underline" />
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
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="text-[11px] font-semibold text-ink-muted">
                                    키워드별 인용 상세 ({c.citations.length}개 키워드) — 어떤 키워드로 · 몇 번 · 어느 AI · 어떤 콘텐츠
                                  </div>
                                  {/* Round 36 fix 3 — 도메인 일괄 분석 + 위서클 가이드 비교 진단 */}
                                  <LearnFromDomainButton
                                    domain={c.domain}
                                    urls={c.urls}
                                    keywords={c.keywords}
                                    sourceTier={c.tier}
                                    tenantId={tenantId}
                                  />
                                </div>
                                <CitationBreakdown citations={c.citations} />
                                <div className="mt-2 text-[10px] text-ink-muted">
                                  💡 <strong>학습 포인트</strong> — 위 버튼으로 URL 일괄 분석 → 위서클 가이드 v3 와 자동 비교 → 권장 변경사항 진단
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Round 52 — 모바일 카드 list */}
              <div className="space-y-2 px-3 py-3 md:hidden">
                {detailRows.map((c, i) => {
                  // Round 70 — 우리 병원 강조 카드 (순위 위치)
                  if (c._client) {
                    return (
                      <div key={`m-client-${i}`} className="rounded-lg border-2 border-ink bg-surface-muted/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-semibold text-ink-soft">⭐ {c.domain}</span>
                            <span className="shrink-0 rounded bg-ink px-1.5 py-0.5 text-[9px] font-bold text-white">우리 병원</span>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-mono text-[16px] font-bold text-ink-soft">{c.count}</div>
                            <div className="text-[9px] uppercase text-ink">우리 위치</div>
                          </div>
                        </div>
                        {c.keywords.length > 0 && (
                          <div className="mt-1.5 text-[10px] text-ink">{c.keywords.join(', ')}</div>
                        )}
                      </div>
                    );
                  }
                  const isOpen = expandedDomain === c.domain;
                  const tierMeta = TIER_LABELS[c.tier];
                  return (
                    <div
                      key={`m-${c.domain}-${i}`}
                      className={cn(
                        'rounded-lg border bg-surface-base transition',
                        c.tier === 'T5' ? 'border-status-danger/30' : 'border-border'
                      )}
                    >
                      {/* 카드 헤더 — 클릭으로 expand */}
                      <button
                        type="button"
                        onClick={() => setExpandedDomain(isOpen ? null : c.domain)}
                        className="flex w-full items-start justify-between gap-2 p-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" />}
                            <span className="truncate font-mono text-[12px] font-semibold text-ink">{c.domain}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor: `${tierMeta?.color}20`,
                                color: tierMeta?.color ?? '#64748B',
                              }}
                            >
                              {tierMeta?.short ?? c.tier}
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              키워드 {c.keywords.length}개
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-[16px] font-bold text-ink">{c.count}</div>
                          <div className="text-[9px] uppercase text-ink-muted">횟수</div>
                        </div>
                      </button>

                      {/* expand 내용 — Round 64 키워드별 인용 드릴다운 */}
                      {isOpen && (
                        <div className="border-t border-border bg-surface-subtle/60 px-3 py-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                              키워드별 인용 상세 ({c.citations.length})
                            </div>
                            <LearnFromDomainButton
                              domain={c.domain}
                              urls={c.urls}
                              keywords={c.keywords}
                              sourceTier={c.tier}
                              tenantId={tenantId}
                            />
                          </div>
                          <CitationBreakdown citations={c.citations} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// Round 64 — 차트 막대 호버 시 도메인·인용수·tier·키워드수 표시
function CompetitorBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { domain: string; count: number; tier: string; keywords?: string[] } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-[11px] shadow-md">
      <div className="font-mono font-semibold text-ink">{d.domain}</div>
      <div className="mt-0.5 text-ink-soft">
        인용 <strong className="text-ink">{d.count}</strong>회 · {TIER_LABELS[d.tier]?.label ?? d.tier}
      </div>
      <div className="mt-0.5 text-[10px] text-ink-muted">키워드 {d.keywords?.length ?? 0}개 · 행 클릭 시 상세</div>
    </div>
  );
}
