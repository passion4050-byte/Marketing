/**
 * Round 144 (2026-08-02) — 주제 공간 경쟁 현황.
 *
 * "우리가 쓴 이 글의 주제를, 지금 누가 가져가고 있는가."
 * 해외 영문 슬러그가 경쟁사 URL 과 동일하다는 실측(smile-lasik-in-korea →
 * 경쟁사 5개 도메인 15회 vs 우리 0회)에서 출발.
 */
'use client';

import { useEffect, useState } from 'react';
import { Swords, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { scopeToContentLang, readScope, SCOPE_EVENT } from '@/components/admin/ScopeSelector';

interface Row {
  slug: string;
  title: string | null;
  ids: number[];
  langs: string[];
  articleCount: number;
  ageDays: number | null;
  mature: boolean;
  ourCitations: number;
  rivalCitations: number;
  rivalDomainCount: number;
  rivals: Array<{ domain: string; citations: number }>;
  verdict: 'contested_losing' | 'contested_winning' | 'uncontested' | 'no_signal';
}

interface Resp {
  ok: boolean;
  rows: Row[];
  summary: {
    contestedLosing: number;
    contestedWinning: number;
    uncontested: number;
    totalRivalCitations: number;
    totalOurCitations: number;
  };
}

const VERDICT: Record<Row['verdict'], { label: string; cls: string }> = {
  contested_losing: { label: '경쟁 중 · 열세', cls: 'bg-status-dangerSoft text-status-danger' },
  contested_winning: { label: '경쟁 중 · 확보', cls: 'bg-status-successSoft text-status-success' },
  uncontested: { label: '무경쟁 확보', cls: 'bg-accent/15 text-accent-deep' },
  no_signal: { label: '신호 없음', cls: 'bg-surface-subtle text-ink-muted' },
};

export function SlugRivalry() {
  const [scope, setScope] = useState('all');
  const [d, setD] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setScope(readScope());
    const on = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (typeof v === 'string') setScope(v);
    };
    window.addEventListener(SCOPE_EVENT, on);
    return () => window.removeEventListener(SCOPE_EVENT, on);
  }, []);

  useEffect(() => {
    let alive = true;
    setD(null);
    setErr(null);
    const lang = scopeToContentLang(scope);
    fetch(`/api/admin/slug-rivalry?limit=25${lang ? `&lang=${encodeURIComponent(lang)}` : ''}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j.ok) throw new Error(j.error || '불러오기 실패');
        setD(j);
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : '오류'));
    return () => {
      alive = false;
    };
  }, [scope]);

  return (
    <section className="card mt-6">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Swords className="h-4 w-4 text-ink-soft" />
          주제 공간 경쟁 현황 — 이 주제를 지금 누가 가져가는가
        </h2>
        <div className="mt-0.5 text-[11px] text-ink-muted">
          우리가 발행한 글과 <strong className="text-ink">같은 URL 슬러그</strong>로 AI 에 인용되는
          외부 도메인. 같은 슬러그 = 같은 질문 공간에서 정면 경쟁 중이라는 뜻입니다.
        </div>
      </header>

      {err ? (
        <div className="px-5 py-8 text-center text-xs text-status-danger">불러오기 실패: {err}</div>
      ) : !d ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-[12px] text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 경쟁 현황 분석 중…
        </div>
      ) : d.rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-ink-muted">
          이 스코프에서 슬러그 단위 경쟁 신호가 아직 없습니다.
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3 md:px-5">
            <Chip n={d.summary.contestedLosing} l="경쟁 중 · 열세" tone="danger" />
            <Chip n={d.summary.contestedWinning} l="경쟁 중 · 확보" tone="success" />
            <Chip n={d.summary.uncontested} l="무경쟁 확보" tone="accent" />
            <div className="ml-auto self-center text-[11px] text-ink-muted">
              관측 인용 — 경쟁사{' '}
              <strong className="text-ink">{d.summary.totalRivalCitations.toLocaleString()}</strong> vs
              우리 <strong className="text-ink">{d.summary.totalOurCitations.toLocaleString()}</strong>
            </div>
          </div>

          <div className="divide-y divide-border">
            {d.rows.map((r) => {
              const v = VERDICT[r.verdict];
              const isOpen = open === r.slug;
              const total = r.ourCitations + r.rivalCitations;
              const ourPct = total > 0 ? (r.ourCitations / total) * 100 : 0;
              return (
                <div key={r.slug}>
                  <button
                    onClick={() => setOpen(isOpen ? null : r.slug)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-subtle md:px-5"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[12px] font-semibold text-ink">{r.slug}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${v.cls}`}>
                          {v.label}
                        </span>
                        {r.langs.map((l) => (
                          <span
                            key={l}
                            className="rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] text-ink-muted"
                          >
                            {l}
                          </span>
                        ))}
                        {!r.mature && r.ageDays != null && (
                          <span className="rounded-full bg-status-warningSoft px-2 py-0.5 text-[10px] font-bold text-status-warning">
                            평가 유보 (D+{r.ageDays})
                          </span>
                        )}
                      </div>
                      {/* 점유 바 */}
                      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                        <div className="bg-accent-deep" style={{ width: `${ourPct}%` }} />
                        <div
                          className="bg-status-danger/60"
                          style={{ width: `${100 - ourPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold text-ink">
                        <span className="text-accent-deep">{r.ourCitations}</span>
                        <span className="text-ink-faint"> : </span>
                        <span className="text-status-danger">{r.rivalCitations}</span>
                      </div>
                      <div className="text-[10px] text-ink-muted">우리 : 경쟁사</div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-surface-subtle/40 px-4 pb-4 pt-1 md:px-5">
                      {r.title && (
                        <div className="mb-2 text-[12px] text-ink-soft">
                          우리 글: <strong className="text-ink">{r.title}</strong>{' '}
                          <span className="text-ink-muted">
                            ({r.articleCount}편 · id {r.ids.slice(0, 5).join(', ')})
                          </span>
                        </div>
                      )}
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                        이 슬러그로 인용되는 외부 도메인 ({r.rivalDomainCount}개)
                      </div>
                      <div className="space-y-1">
                        {r.rivals.map((rv) => (
                          <div
                            key={rv.domain}
                            className="flex items-center gap-2 text-[12px] text-ink-soft"
                          >
                            <span className="w-10 shrink-0 text-right font-mono font-bold text-status-danger">
                              {rv.citations}
                            </span>
                            <a
                              href={`https://${rv.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {rv.domain}
                            </a>
                          </div>
                        ))}
                      </div>
                      {r.verdict === 'contested_losing' && (
                        <div className="mt-3 rounded-md border border-status-dangerSoft bg-status-dangerSoft/25 px-3 py-2 text-[11px] leading-relaxed text-status-danger">
                          <strong>같은 주제로 경쟁사가 {r.rivalCitations}회 인용되는 동안 우리는 0회입니다.</strong>{' '}
                          {r.mature
                            ? '색인 기간은 충분히 지났습니다 — 콘텐츠·권위 측면에서 밀리고 있다는 뜻이므로, 이 주제를 가져오려면 같은 형식으로 한 편 더 쓰는 것 이상이 필요합니다.'
                            : '아직 색인 적재 중일 수 있어 판단을 유보합니다. 6주 경과 후 재확인하세요.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-border bg-surface-subtle/50 px-4 py-2.5 text-[10px] leading-relaxed text-ink-muted md:px-5">
            ※ 같은 슬러그를 쓴다는 건 회피할 문제가 아니라 <strong>가져와야 할 주제</strong>라는
            신호이기도 합니다(클라이언트가 원하는 주제이므로). 다만 &ldquo;같은 형식의 글을 한 편 더&rdquo;로는
            이기지 못한다는 것이 실측입니다 — 경쟁 도메인이 무엇을 갖고 있는지 먼저 확인하세요.
          </div>
        </div>
      )}
    </section>
  );
}

function Chip({ n, l, tone }: { n: number; l: string; tone: 'danger' | 'success' | 'accent' }) {
  const cls =
    tone === 'danger'
      ? 'border-status-danger/30 bg-status-dangerSoft/40 text-status-danger'
      : tone === 'success'
      ? 'border-status-success/30 bg-status-successSoft/40 text-status-success'
      : 'border-accent/30 bg-accent/10 text-accent-deep';
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {l} <span className="tabular-nums">{n}</span>
    </span>
  );
}
