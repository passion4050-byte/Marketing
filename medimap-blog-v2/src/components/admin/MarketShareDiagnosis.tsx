/**
 * Round 88 (2026-06-28) — AI 시장 점유 진단 위젯.
 *
 * 비즈니스 본질 문제 직시: AI 가 실제 인용하는 도메인 vs medimap-blog 위치.
 *
 * 발견 (2026-06-28 DB 진단):
 *   - 30일간 AI source_domains 에 medimap-blog-phi.vercel.app = 0회 인용
 *   - 경쟁사 (sueye/bnviit/bgneye) 누적 200+ 인용
 *   - 위서클 mentions 카운트는 brand 텍스트 매칭일 뿐 — 도메인 인용 아님
 *
 * 원인:
 *   1. vercel.app 무료 서브도메인 → 색인 후순위
 *   2. 새 사이트 → 도메인 권위 0
 *   3. AI 학습 데이터에 없음 (2024 cutoff)
 *
 * 해결:
 *   1. 커스텀 도메인 전환 (blog.wecircle.co.kr) — 코드 NEXT_PUBLIC_SITE_URL 이미 지원
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

  // Round 121 (2026-07-03) — 세부 인용 URL → 학습 파이프라인 직결.
  //   URL 행의 "학습" 버튼: ① learn-from-url (analyze: fetch+패턴 분석)
  //   → ② learn-from-url?save=true (learned_insights UPSERT, applied=true)
  //   → 다음 cron 콘텐츠 생성 prompt 에 자동 주입 (기존 학습 인사이트 루프 재사용).
  const [learnState, setLearnState] = useState<
    Record<string, 'loading' | 'done' | 'error'>
  >({});

  async function learnUrl(p: PathRow, sourceDomain: string) {
    const key = p.url;
    if (learnState[key] === 'loading' || learnState[key] === 'done') return;
    setLearnState((m) => ({ ...m, [key]: 'loading' }));
    try {
      const keyword = p.keywords[0] ?? null;
      const r1 = await fetch('/api/admin/learn-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: p.url, keyword, source_domain: sourceDomain }),
      });
      const j1 = await r1.json().catch(() => null);
      if (!r1.ok || !j1?.ok || !j1?.patterns) throw new Error(j1?.error ?? '분석 실패');
      const r2 = await fetch('/api/admin/learn-from-url?save=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: p.url,
          keyword,
          patterns: j1.patterns,
          source_domain: sourceDomain,
          notes: `대시보드 도메인 Top10 에서 학습 (${sourceDomain}, ${p.cites}회 인용)`,
        }),
      });
      const j2 = await r2.json().catch(() => null);
      if (!r2.ok || !j2?.ok) throw new Error(j2?.error ?? '저장 실패');
      setLearnState((m) => ({ ...m, [key]: 'done' }));
    } catch {
      setLearnState((m) => ({ ...m, [key]: 'error' }));
    }
  }

  return (
    <section className="card mt-6">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Globe className="h-4 w-4 text-ink-soft" />
          AI 시장 점유 진단 — 도메인 Top 10 ({daysWindow}일)
        </h2>
        <div className="mt-1 text-[11px] text-ink-muted">
          AI 가 실제로 source URL 로 인용한 도메인 분포 — 우리 위치를 객관적으로 직시
        </div>
      </header>

      {/* Round 119-b: 근본 해결 가이드 리스트 삭제 (조치 전부 완료 — 사용자 요청).
          0건 상태만 한 줄 컴팩트 배지로 유지 — 색인·인용 누적 대기 중임을 표시. */}
      {/* Round 124-B — 빨간 경고 → 뉴트럴 상태 라벨 (조치 완료·대기 상태라 위험 톤 불필요) */}
      {isCritical && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-subtle/60 px-4 py-2.5 md:px-5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-ink-muted" />
          <span className="text-[12px] font-bold text-ink">
            위서클 도메인 AI 인용 0건 ({daysWindow}일)
          </span>
          <span className="hidden text-[11px] text-ink-muted sm:inline">
            — 도메인 전환·GSC·네이버 제출 조치 완료, 색인·인용 누적 대기 중 (수 주~수개월)
          </span>
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
                        className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-ink"
                      >
                        {d.domain || '(URL 파싱 실패)'}
                        {d.domain && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      {d.isOwn ? (
                        <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink">
                          ⭐ 자사
                        </span>
                      ) : d.isCompetitor ? (
                        <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink-soft">
                          경쟁사
                        </span>
                      ) : (
                        <span className="rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-gold-deep">권위/플랫폼</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-bold text-ink">
                      {d.citations.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{share.toFixed(1)}%</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-surface-subtle/60">
                      <td colSpan={5} className="px-4 py-3">
                        {!ps || ps.loading ? (
                          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                            <Loader2 className="h-3 w-3 animate-spin" /> 인용된 콘텐츠 경로 로드 중…
                          </div>
                        ) : ps.error ? (
                          <div className="text-[11px] text-status-danger">불러오기 실패: {ps.error}</div>
                        ) : !ps.paths || ps.paths.length === 0 ? (
                          <div className="text-[11px] text-ink-muted">
                            이 도메인은 세부 URL 없이 도메인 단위로만 인용이 수집됐습니다. (다음 측정 cron 부터 URL 누적)
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
                                      className="truncate font-mono text-[11px] text-ink hover:underline"
                                      title={p.url}
                                    >
                                      {p.path}
                                    </a>
                                    <span className="flex shrink-0 items-center gap-2">
                                      <span className="font-mono text-[11px] font-bold text-ink">{p.cites}회</span>
                                      {/* Round 121 — 이 URL 을 학습해 다음 콘텐츠 생성에 반영 */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void learnUrl(p, d.domain);
                                        }}
                                        disabled={learnState[p.url] === 'loading' || learnState[p.url] === 'done'}
                                        title="이 URL 의 구조·패턴을 분석해 learned_insights 에 저장 — 다음 cron 생성 prompt 에 자동 주입"
                                        className={
                                          learnState[p.url] === 'done'
                                            ? 'inline-flex items-center gap-1 rounded border border-status-success/30 bg-status-successSoft px-1.5 py-0.5 text-[10px] font-bold text-status-success'
                                            : learnState[p.url] === 'error'
                                              ? 'inline-flex items-center gap-1 rounded border border-status-danger/30 bg-status-dangerSoft px-1.5 py-0.5 text-[10px] font-bold text-status-danger hover:opacity-80'
                                              : 'inline-flex items-center gap-1 rounded border border-accent/30 bg-accent-soft/50 px-1.5 py-0.5 text-[10px] font-bold text-accent-deep transition hover:bg-accent-soft disabled:opacity-60'
                                        }
                                      >
                                        {learnState[p.url] === 'loading' ? (
                                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-2.5 w-2.5" />
                                        )}
                                        {learnState[p.url] === 'done'
                                          ? '학습됨'
                                          : learnState[p.url] === 'error'
                                            ? '실패 · 재시도'
                                            : learnState[p.url] === 'loading'
                                              ? '분석 중'
                                              : '학습'}
                                      </button>
                                    </span>
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
                            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[10px] text-ink-muted">
                              💡 <strong>학습</strong> 버튼 — 해당 글의 구조·패턴을 분석해 저장하면 다음 cron 생성 prompt 에 자동 반영됩니다.
                              <Link
                                href="/admin/learned-insights"
                                className="font-semibold text-ink hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                학습 인사이트 관리 →
                              </Link>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {/* 위서클 위치 명시 (rank 11 ~ 가상 row) */}
            <tr className={isCritical ? 'border-t-2 border-ink/15 bg-surface-subtle/60' : 'border-t border-border bg-surface-subtle/60'}>
              <td className="px-3 py-2 font-mono text-[10px]">⭐</td>
              <td className="px-3 py-2">
                <span className="text-sm font-bold text-ink">wecircle.co.kr</span>
                <span className="ml-2 text-[10px] text-ink-muted">(자사 블로그)</span>
              </td>
              <td className="px-3 py-2">
                <span className="rounded bg-accent-soft/60 px-1.5 py-0.5 text-[10px] font-bold text-accent-deep">
                  ⭐ 자사
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <span className="font-mono text-sm font-bold text-ink">
                  {medimapCitations}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">{medimapShare.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-surface-subtle/50 px-4 py-2 text-[10px] text-ink-muted md:px-5">
        <Sparkles className="mr-1 inline h-2.5 w-2.5 text-ink-soft" />
        총 {totalCitations.toLocaleString()}건 source URL 중 분포 ·
        <Link href="/admin/competitors" className="ml-1 font-semibold text-ink hover:underline">
          경쟁사 분석 자세히 <ArrowRight className="inline h-2 w-2" />
        </Link>
      </div>
    </section>
  );
}
