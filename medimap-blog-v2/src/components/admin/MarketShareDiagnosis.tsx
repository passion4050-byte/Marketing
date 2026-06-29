/**
 * Round 88 (2026-06-28) — AI 시장 점유 진단 위젯.
 *
 * 비즈니스 본질 문제 직시: AI 가 실제 인용하는 도메인 vs medimap-blog 위치.
 *
 * 발견 (2026-06-28 DB 진단):
 *   - 30일간 AI source_domains 에 medimap-blog-phi.vercel.app = 0회 인용
 *   - 경쟁사 (sueye/bnviit/bgneye) 누적 200+ 인용
 *   - 메디맵 mentions 카운트는 brand 텍스트 매칭일 뿐 — 도메인 인용 아님
 *
 * 원인:
 *   1. vercel.app 무료 서브도메인 → 색인 후순위
 *   2. 새 사이트 → 도메인 권위 0
 *   3. AI 학습 데이터에 없음 (2024 cutoff)
 *
 * 해결:
 *   1. 커스텀 도메인 전환 (blog.medi-map.co.kr) — 코드 NEXT_PUBLIC_SITE_URL 이미 지원
 *   2. 권위 도메인 backlink (modoodoc/hidoc 게재)
 *   3. GSC 색인 가속 (사용자 직접)
 */
'use client';

import { useState, Fragment } from 'react';
import { AlertTriangle, Globe, Sparkles, ArrowRight, ExternalLink, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DomainRow {
  domain: string;
  citations: number;
  isOwn?: boolean;
  isCompetitor?: boolean;
}

interface PathRow {
  url: string;
  path: string;
  cites: number;
  engines: string[];
  keywords: string[];
}
interface PathState {
  loading: boolean;
  error: string | null;
  paths: PathRow[] | null;
}

const ENGINE_BADGE: Record<string, string> = {
  gemini: 'bg-engine-gemini/10 text-engine-gemini',
  claude: 'bg-engine-claude/10 text-engine-claude',
  openai: 'bg-engine-chatgpt/10 text-engine-chatgpt',
  perplexity: 'bg-engine-perplexity/10 text-engine-perplexity',
};
const ENGINE_LABEL: Record<string, string> = {
  gemini: 'Gemini', claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity',
};

interface Props {
  domains: DomainRow[];
  medimapCitations: number; // medimap-blog 도메인 인용 (0 일 가능성 높음)
  totalCitations: number;
  daysWindow?: number;
}

export function MarketShareDiagnosis({
  domains,
  medimapCitations,
  totalCitations,
  daysWindow = 30,
}: Props) {
  const medimapShare = totalCitations > 0 ? (medimapCitations / totalCitations) * 100 : 0;
  const isCritical = medimapCitations === 0;

  // Round 104 ①-b — 도메인 행 클릭 → 그 도메인이 AI 에 인용된 "실제 콘텐츠 경로" 펼침.
  //   citation-paths API (tenantId 없이 전사 집계). 도메인별 1회 fetch 후 캐시.
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pathCache, setPathCache] = useState<Record<string, PathState>>({});

  async function togglePaths(domain: string) {
    if (!domain) return;
    const next = expanded === domain ? null : domain;
    setExpanded(next);
    if (next && !pathCache[domain]) {
      setPathCache((p) => ({ ...p, [domain]: { loading: true, error: null, paths: null } }));
      try {
        const r = await fetch(
          `/api/admin/citation-paths?domain=${encodeURIComponent(domain)}&days=${daysWindow}`,
        );
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || '불러오기 실패');
        setPathCache((p) => ({ ...p, [domain]: { loading: false, error: null, paths: j.paths ?? [] } }));
      } catch (e) {
        setPathCache((p) => ({
          ...p,
          [domain]: { loading: false, error: e instanceof Error ? e.message : '오류', paths: null },
        }));
      }
    }
  }

  return (
    <section className="card mt-6">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Globe className="h-4 w-4 text-brand" />
          AI 시장 점유 진단 — 도메인 Top 10 ({daysWindow}일)
        </h2>
        <div className="mt-1 text-[11px] text-ink-muted">
          AI 가 실제로 source URL 로 인용한 도메인 분포 — 우리 위치를 객관적으로 직시
        </div>
      </header>

      {/* 🚨 medimap-blog 위치 진단 (가장 위) */}
      {isCritical && (
        <div className="border-b border-status-danger/30 bg-status-danger/5 px-4 py-3 md:px-5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-danger" />
            <div className="flex-1">
              <div className="text-sm font-bold text-status-danger">
                🚨 메디맵 도메인 AI 인용 = 0건 (30일)
              </div>
              <p className="mt-1 text-[12px] text-ink-soft">
                medimap-blog 의 콘텐츠가 단 한 번도 AI source URL 로 인용되지 않았습니다.
                위 도메인별 분포는 <strong>경쟁사가 우리 시장을 점유</strong>하고 있음을 보여줍니다.
                현재 measure mentions 카운트는 <em>"메디맵" 텍스트 매칭</em> proxy일 뿐 실제 도메인 인용은 아닙니다.
              </p>
              <div className="mt-3 rounded-md border border-status-danger/20 bg-white px-3 py-2 text-[11px]">
                <div className="font-semibold text-ink">🎯 근본 해결 (우선순위 순)</div>
                <ol className="ml-4 mt-1 list-decimal space-y-1 text-ink-soft">
                  <li>
                    <strong>커스텀 도메인 전환</strong> — <code className="rounded bg-surface-subtle px-1">blog.medi-map.co.kr</code> 으로 (vercel.app 색인 천장 우회).
                    코드 <code className="rounded bg-surface-subtle px-1">NEXT_PUBLIC_SITE_URL</code> 이미 지원.
                  </li>
                  <li>
                    <strong>GSC 색인 가속</strong> — Search Console 에서 sitemap 재제출 +
                    각 글 URL Inspect → 색인 요청.
                  </li>
                  <li>
                    <strong>권위 도메인 backlink</strong> — modoodoc/hidoc 같은 의료 매체에 메디맵 콘텐츠 게재 협상.
                  </li>
                  <li>
                    <strong>네이버 색인 강화</strong> — IndexNow 이미 핑하고 있지만 네이버 서치어드바이저 수동 제출 권장.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 도메인 Top 표 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">도메인</th>
              <th className="px-3 py-2 text-left">분류</th>
              <th className="px-3 py-2 text-right">인용 수</th>
              <th className="px-3 py-2 text-right">비중</th>
            </tr>
          </thead>
          <tbody>
            {domains.slice(0, 10).map((d, i) => {
              const share = totalCitations > 0 ? (d.citations / totalCitations) * 100 : 0;
              const isOpen = expanded === d.domain;
              const ps = d.domain ? pathCache[d.domain] : undefined;
              return (
                <Fragment key={d.domain || `null-${i}`}>
                  <tr
                    className={`border-t border-border ${d.domain ? 'cursor-pointer hover:bg-surface-subtle' : ''}`}
                    onClick={() => d.domain && togglePaths(d.domain)}
                  >
                    <td className="px-3 py-2 font-mono text-[10px] text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        {d.domain ? (
                          isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                        ) : (
                          <span className="inline-block w-3" />
                        )}
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={d.domain ? `https://${d.domain}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-brand-700"
                      >
                        {d.domain || '(URL 파싱 실패)'}
                        {d.domain && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      {d.isOwn ? (
                        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                          ⭐ 자사
                        </span>
                      ) : d.isCompetitor ? (
                        <span className="rounded bg-status-warningSoft px-1.5 py-0.5 text-[10px] font-bold text-status-warning">
                          경쟁사
                        </span>
                      ) : (
                        <span className="text-[10px] text-ink-muted">권위/플랫폼</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-bold text-ink">
                      {d.citations.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{share.toFixed(1)}%</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-brand-50/30">
                      <td colSpan={5} className="px-4 py-3">
                        {!ps || ps.loading ? (
                          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                            <Loader2 className="h-3 w-3 animate-spin" /> 인용된 콘텐츠 경로 로드 중…
                          </div>
                        ) : ps.error ? (
                          <div className="text-[11px] text-status-danger">불러오기 실패: {ps.error}</div>
                        ) : !ps.paths || ps.paths.length === 0 ? (
                          <div className="text-[11px] text-ink-muted">
                            세부 인용 URL이 아직 없습니다. (Gemini grounding 위주로 채워지며, Claude/OpenAI 는 다음 측정부터 누적)
                          </div>
                        ) : (
                          <div>
                            <div className="mb-2 text-[11px] font-semibold text-ink-muted">
                              AI 가 인용한 실제 콘텐츠 경로 — 어떤 글이 · 몇 번 · 어느 AI · 어떤 키워드로 ({ps.paths.length}개)
                            </div>
                            <ul className="space-y-1.5">
                              {ps.paths.slice(0, 12).map((p) => (
                                <li key={p.url} className="rounded-md border border-border bg-white px-2.5 py-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="truncate font-mono text-[11px] text-brand-700 hover:underline"
                                      title={p.url}
                                    >
                                      {p.path}
                                    </a>
                                    <span className="shrink-0 font-mono text-[11px] font-bold text-ink">{p.cites}회</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    {p.engines.map((e) => (
                                      <span
                                        key={e}
                                        className={`rounded px-1 py-0.5 text-[9px] font-bold ${ENGINE_BADGE[e] ?? 'bg-surface-muted text-ink-muted'}`}
                                      >
                                        {ENGINE_LABEL[e] ?? e}
                                      </span>
                                    ))}
                                    {p.keywords.slice(0, 4).map((k) => (
                                      <span key={k} className="rounded bg-surface-subtle px-1 py-0.5 text-[9px] text-ink-soft">
                                        {k}
                                      </span>
                                    ))}
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2 text-[10px] text-ink-muted">
                              💡 <strong>학습 포인트</strong> — 위 경로 글의 주제·구조를 우리 콘텐츠에 반영하면 같은 키워드에서 인용 확률↑ (①-c 자동학습 연결 예정)
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {/* 메디맵 위치 명시 (rank 11 ~ 가상 row) */}
            <tr className={isCritical ? 'border-t-2 border-status-danger/30 bg-status-danger/5' : 'border-t border-border bg-brand-50/30'}>
              <td className="px-3 py-2 font-mono text-[10px]">⭐</td>
              <td className="px-3 py-2">
                <span className="text-sm font-bold text-ink">wecircle.co.kr</span>
                <span className="ml-2 text-[10px] text-ink-muted">(자사 블로그)</span>
              </td>
              <td className="px-3 py-2">
                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                  ⭐ 자사
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <span className={isCritical ? 'font-mono text-sm font-bold text-status-danger' : 'font-mono text-sm font-bold text-brand-700'}>
                  {medimapCitations}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">{medimapShare.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-surface-subtle/50 px-4 py-2 text-[10px] text-ink-muted md:px-5">
        <Sparkles className="mr-1 inline h-2.5 w-2.5 text-brand" />
        총 {totalCitations.toLocaleString()}건 source URL 중 분포 ·
        <Link href="/admin/competitors" className="ml-1 font-semibold text-brand-700 hover:underline">
          경쟁사 분석 자세히 <ArrowRight className="inline h-2 w-2" />
        </Link>
      </div>
    </section>
  );
}
