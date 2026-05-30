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

const TIER_LABELS: Record<string, { label: string; color: string; short: string }> = {
  T3: { label: '권위/공식 사이트', color: '#F59E0B', short: '권위' },
  T4: { label: '의료 플랫폼', color: '#A855F7', short: '플랫폼' },
  T5: { label: '경쟁 안과/병원', color: '#94A3B8', short: '경쟁사' },
};

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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = tenantId
        ? `/api/admin/competitors?tenantId=${tenantId}`
        : '/api/admin/competitors';
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
  }, [tenantId]);

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
      <header className="mb-3 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-ink">AI 인용 추적</h1>
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
              <div className="text-[11px] text-ink-muted">MSD/아산/삼성 등</div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">의료 플랫폼</div>
              <div className="mt-2 kpi-value" style={{ color: TIER_LABELS.T4.color }}>
                {data.tier_distribution.T4}
              </div>
              <div className="text-[11px] text-ink-muted">모두닥/강남언니 등</div>
            </div>
            <div className="card card-pad border-ink/20">
              <div className="kpi-label">경쟁 안과/병원 ⚠️</div>
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
                <table className="w-full text-xs">
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
              <h2 className="section-title">경쟁사 도메인 상세</h2>
              <div className="mt-1 text-[11px] text-ink-muted">
                <strong>행 클릭</strong>으로 실제 인용 URL 펼치기 → 페이지 구조 학습용
              </div>
            </header>
            {data.competitor_top.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-muted">데이터 없음</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
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
                                <div className="mb-2 text-[11px] font-semibold text-ink-muted">
                                  실제 인용된 URL ({c.urls.length}개) — 클릭하면 새 탭에서 열림
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
                                  💡 <strong>학습 포인트</strong> — 위 URL 의 페이지 구조 분석 → 메디맵 콘텐츠 가이드 v4 에 반영
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
          </section>
        </>
      )}
    </div>
  );
}
