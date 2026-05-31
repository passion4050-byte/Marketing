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

import { useEffect, useState } from 'react';
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
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { CitationsTabs } from '@/components/admin/CitationsTabs';

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
  }>;
  keyword_competitor_matrix: Array<{
    keyword: string;
    total_sources: number;
    competitors: Array<{ domain: string; count: number; tier: string }>;
  }>;
  tier_distribution: { T3: number; T4: number; T5: number };
};

// Round 52 fix (2026-05-31) — 라벨 산업 종속 제거. 안과 외 클라이언트(모발이식·피부·한방) 도 동일 적용.
const TIER_LABELS: Record<string, { label: string; color: string; short: string }> = {
  T3: { label: '권위/공식 사이트', color: '#F59E0B', short: '권위' },
  T4: { label: '의료 플랫폼', color: '#A855F7', short: '플랫폼' },
  T5: { label: '동종업계 경쟁사', color: '#94A3B8', short: '경쟁' },
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Round 42 B — label 필터 지원 (?label=DIRECT|INDIRECT|REFERENCE|TO_LEARN|IGNORE)
      const params = new URLSearchParams();
      if (tenantId) params.set('tenantId', String(tenantId));
      if (labelFilter) params.set('label', labelFilter);
      const url = `/api/admin/competitors${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'fetch failed');
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, labelFilter]);

  const tenants = data?.tenants ?? [];
  const selectedName = data?.selected_tenant?.name ?? '전체 클라이언트';
  const businessModel = data?.business_model ?? '';
  const filteredTenants = tenants.filter(
    (t) => !tenantSearch || t.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const totalCompetitorSources = data
    ? data.tier_distribution.T3 + data.tier_distribution.T4 + data.tier_distribution.T5
    : 0;

  return (
    <div className="px-8 py-6 print:px-0 print:py-0">
      <header className="admin-page-header print:hidden">
        <div>
          <h1 className="admin-page-title">AI 인용 추적 — 경쟁사</h1>
          <p className="admin-page-desc">AI 가 우리 클라이언트와 함께 추천하는 경쟁 의료기관을 추적합니다. 행 클릭 시 실제 인용 URL 확인</p>
        </div>
        <div className="flex items-center gap-2">
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
          MEDIMAP GEO · {new Date().toLocaleString('ko-KR')} · 비즈니스 모델: {businessModel}
        </p>
      </div>

      {/* === 클라이언트 selector === */}
      <section className="card mb-5 p-4 print:hidden">
        <div className="mb-2 text-xs font-semibold text-ink-muted">클라이언트 선택</div>
        <div className="relative max-w-md">
          <button
            type="button"
            onClick={() => setTenantDropdownOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-base px-3 py-2 text-sm transition hover:border-brand-200"
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
                    className="w-full rounded-md border border-border bg-surface-subtle py-1.5 pl-7 pr-2 text-xs focus:border-brand focus:outline-none"
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
                      tenantId === null && 'bg-brand-50 font-semibold text-brand'
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
                        tenantId === t.id && 'bg-brand-50 font-semibold text-brand'
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
          <div className="mt-3 rounded-md bg-brand-50/40 px-3 py-2 text-[11px]">
            <span className="font-semibold text-brand-700">비즈니스 모델:</span>{' '}
            <span className="text-ink-soft">{businessModel}</span>
            <div className="mt-1 text-[10px] text-ink-muted">
              ℹ️ 경쟁사 측정 — 매주 월·목 06:00 자동 측정
            </div>
          </div>
        )}
        <div className="mt-2 text-[11px] text-ink-muted">
          현재 선택: <strong className="text-ink">{selectedName}</strong> · 최근 30일 기준
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
                          <span className="truncate font-mono text-ink" title={c.domain}>{c.domain}</span>
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

              {/* 2. 학습 후보 — 인용 횟수 많은데 메디맵 baseline 에 없는 도메인 (T3 = 권위) */}
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
                          <span className="truncate font-mono text-ink" title={c.domain}>{c.domain}</span>
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
              <div className="card card-pad border-l-4 border-l-brand">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">
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
                <div className="mt-2 text-[10px] text-ink-muted">매주 월·목 06:00 자동 측정 기준</div>
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

          {/* === Top 경쟁사 도메인 차트 === */}
          <section className="mb-6 card card-pad">
            <h2 className="section-title mb-3">경쟁사 도메인 Top 10</h2>
            {data.competitor_top.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-ink-muted">
                아직 경쟁사 출처 데이터 없음
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, data.competitor_top.length * 28)}>
                <BarChart data={data.competitor_top.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                  <XAxis type="number" fontSize={10} stroke="#64748B" allowDecimals={false} />
                  <YAxis type="category" dataKey="domain" fontSize={10} stroke="#64748B" width={180} />
                  <Tooltip />
                  <Bar dataKey="count" name="인용 횟수">
                    {data.competitor_top.slice(0, 10).map((d, i) => (
                      <Cell key={i} fill={TIER_LABELS[d.tier]?.color ?? '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

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
                      { key: 'TO_LEARN', label: '분석 대상', color: 'bg-brand text-white border-brand' },
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
                    {data.competitor_top.map((c, i) => {
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
                            <td className="px-3 py-2 font-mono text-ink">{c.domain}</td>
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
                            <td className="px-3 py-2 text-[11px] text-ink-soft line-clamp-1">
                              {c.keywords.join(', ')}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${c.domain}-expand`} className="bg-brand-50/40">
                              <td colSpan={5} className="px-4 py-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="text-[11px] font-semibold text-ink-muted">
                                    실제 인용된 URL ({c.urls.length}개) — 클릭하면 새 탭에서 열림
                                  </div>
                                  {/* Round 36 fix 3 — 도메인 일괄 분석 + 메디맵 가이드 비교 진단 */}
                                  <LearnFromDomainButton
                                    domain={c.domain}
                                    urls={c.urls}
                                    keywords={c.keywords}
                                    sourceTier={c.tier}
                                    tenantId={tenantId}
                                  />
                                </div>
                                {c.urls.length === 0 ? (
                                  <div className="text-[11px] text-ink-faint">URL 데이터 없음</div>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {c.urls.map((url, ui) => (
                                      <li key={ui} className="flex items-start gap-2">
                                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[11px] text-brand-700 underline decoration-dotted hover:text-brand"
                                        >
                                          {decodeURIComponent(url).slice(0, 110)}
                                          {url.length > 110 && '…'}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <div className="mt-2 text-[10px] text-ink-muted">
                                  💡 <strong>학습 포인트</strong> — 위 버튼으로 N개 URL 일괄 분석 → 메디맵 가이드 v3 와 자동 비교 → 권장 변경사항 진단
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

              {/* Round 52 — 모바일 카드 list */}
              <div className="space-y-2 px-3 py-3 md:hidden">
                {data.competitor_top.map((c, i) => {
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

                      {/* expand 내용 */}
                      {isOpen && (
                        <div className="border-t border-border bg-brand-50/30 px-3 py-3">
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                            인용된 키워드
                          </div>
                          <div className="mb-3 flex flex-wrap gap-1">
                            {c.keywords.map((kw, ki) => (
                              <span key={ki} className="rounded bg-surface-base px-1.5 py-0.5 text-[10px] text-ink-soft">
                                {kw}
                              </span>
                            ))}
                          </div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                              실제 URL ({c.urls.length}개)
                            </div>
                            <LearnFromDomainButton
                              domain={c.domain}
                              urls={c.urls}
                              keywords={c.keywords}
                              sourceTier={c.tier}
                              tenantId={tenantId}
                            />
                          </div>
                          {c.urls.length === 0 ? (
                            <div className="text-[10px] text-ink-faint">URL 데이터 없음</div>
                          ) : (
                            <ul className="space-y-1">
                              {c.urls.slice(0, 5).map((url, ui) => (
                                <li key={ui} className="flex items-start gap-1.5">
                                  <ExternalLink className="mt-0.5 h-2.5 w-2.5 shrink-0 text-brand" />
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-[10px] text-brand-700 underline decoration-dotted"
                                  >
                                    {decodeURIComponent(url).slice(0, 80)}
                                    {url.length > 80 && '…'}
                                  </a>
                                </li>
                              ))}
                              {c.urls.length > 5 && (
                                <li className="text-[10px] text-ink-muted">… 그 외 {c.urls.length - 5}개 (데스크탑에서 전체 보기)</li>
                              )}
                            </ul>
                          )}
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
