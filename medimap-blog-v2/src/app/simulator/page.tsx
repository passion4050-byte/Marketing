/**
 * AI 응답 시뮬레이터 — BEFORE / AFTER 비교 (4 엔진 동시 호출).
 * Figma 시안(node 804:396) IA 100% 싱크로.
 */
'use client';

import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { simulatorSuggestions, simulatorThreads, simulatorTurns } from '@/lib/mock-data';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { showToast } from '@/lib/clientActions';
import type { LlmEngine, SimulatorTurn } from '@/lib/types';

const ENGINE_LABEL: Record<LlmEngine, { name: string; brand: string }> = {
  chatgpt: { name: 'ChatGPT', brand: 'GPT' },
  claude: { name: 'Claude', brand: 'CL' },
  gemini: { name: 'Gemini', brand: 'GE' },
  perplexity: { name: 'Perplexity', brand: 'PX' }
};

const ENGINE_TONE: Record<LlmEngine, string> = {
  chatgpt: 'bg-engine-chatgpt',
  claude: 'bg-engine-claude',
  gemini: 'bg-engine-gemini',
  perplexity: 'bg-engine-perplexity'
};

export default function SimulatorPage() {
  const [activeThreadId, setActiveThreadId] = useState(simulatorThreads[0].id);
  const [extraTurns, setExtraTurns] = useState<SimulatorTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const activeThread = simulatorThreads.find((t) => t.id === activeThreadId) ?? simulatorThreads[0];
  const baseTurns = simulatorTurns.filter((t) => t.threadId === activeThread.id);
  const turns = [...baseTurns, ...extraTurns.filter((t) => t.threadId === activeThread.id)];

  const onSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q) {
      showToast('질문을 입력하세요', { kind: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/simulator/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, applyGeo: true })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'compare failed');
      const newTurn: SimulatorTurn = {
        id: `turn-${Date.now()}`,
        threadId: activeThread.id,
        speaker: 'user',
        query: q,
        askedAt: data.askedAt,
        responses: data.responses
      };
      setExtraTurns((prev) => [...prev, newTurn]);
      setInput('');
      showToast(`4 엔진 비교 완료 — ${q.slice(0, 18)}…`);
    } catch (err) {
      showToast(`오류: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title="AI 응답 시뮬레이터"
        subtitle="GEO 데이터 적용 전·후 답변을 모델별로 비교해 데이터 피딩 효과를 검증합니다."
        tabs={[
          { label: '통합 대시보드 & AI 모니터링', href: '/' },
          { label: '데이터 피딩', href: '/data-feeding' }
        ]}
      />

      <section className="grid grid-cols-1 gap-0 px-8 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-l-xl border border-r-0 border-border bg-surface-base p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">최근 대화</h2>
          <ul className="space-y-2">
            {simulatorThreads.map((thr) => {
              const active = thr.id === activeThreadId;
              return (
                <li key={thr.id}>
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(thr.id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-3 text-left transition',
                      active ? 'border-brand-200 bg-brand-50' : 'border-transparent hover:bg-surface-subtle'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{thr.title}</span>
                      <span className="shrink-0 text-[11px] text-ink-muted">{formatRelative(thr.startedAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-muted">{thr.subtitle}</p>
                    {thr.badge && (
                      <span className="mt-2 inline-flex rounded bg-status-success px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
                        ● {thr.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="rounded-r-xl border border-border bg-surface-base">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-sm font-bold text-ink">비교</span>
              <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">SPLIT</span>
              <div className="ml-4 flex items-center gap-3 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-engine-chatgpt" /> ChatGPT
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-engine-claude" /> Claude
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-engine-gemini" /> Gemini
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-engine-perplexity" /> Perplexity
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 text-ink-muted">
                <span className="h-2 w-2 rounded-sm bg-status-neutral" /> GEO 적용 전
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-brand-700">
                <span className="h-2 w-2 rounded-sm bg-brand" /> GEO 적용 후
              </span>
              <span className="text-ink-muted">{turns.length}개 대화 턴</span>
            </div>
          </header>

          <div className="px-6 py-6">
            {turns.map((turn) => (
              <div key={turn.id} className="mb-8 last:mb-0">
                <div className="mb-4 flex justify-end">
                  <div className="max-w-xl rounded-2xl bg-brand px-4 py-3 text-sm text-white">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-100">
                      나 · {turn.askedAt.slice(11, 16)}
                    </div>
                    {turn.query}
                  </div>
                </div>

                {turn.responses && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    {turn.responses.map((r) => (
                      <div key={r.engine} className="overflow-hidden rounded-lg border border-border">
                        <header className="flex items-center justify-between border-b border-border bg-surface-subtle px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold text-white', ENGINE_TONE[r.engine])}>
                              {ENGINE_LABEL[r.engine].brand}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-ink">{ENGINE_LABEL[r.engine].name}</div>
                              <div className="text-[11px] text-ink-muted">{r.modelLabel}</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-status-success">↑ +{r.deltaPoint}점</span>
                        </header>

                        <div className="border-b border-border bg-surface-subtle px-4 py-3">
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="font-bold uppercase tracking-wider text-ink-muted">BEFORE · GEO 적용 전</span>
                            <span className="text-ink-muted">데이터 피딩 없이 응답</span>
                          </div>
                          <div className="mb-1 flex gap-3 text-[11px] text-ink-muted">
                            <span>정확 {r.before.accuracyScore}</span>
                            <span>톤 {r.before.tonePoint}</span>
                          </div>
                          <div className="text-xs font-semibold text-ink">{r.before.summary}</div>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{r.before.detail}</p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1">
                              {r.before.tags.map((tag) => (
                                <span key={tag} className="chip-neutral">{tag}</span>
                              ))}
                            </div>
                            <span className="text-[11px] text-ink-muted">GEO 멘션 {r.before.mentionCount}회</span>
                          </div>
                        </div>

                        <div className="border-l-4 border-brand bg-brand-50/40 px-4 py-3">
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="font-bold uppercase tracking-wider text-brand-700">AFTER · GEO 적용 후</span>
                            <span className="text-brand-700">GEO 데이터 86% 적용</span>
                          </div>
                          <div className="mb-1 flex gap-3 text-[11px] text-brand-700">
                            <span>정확 {r.after.accuracyScore}</span>
                            <span>톤 {r.after.tonePoint}</span>
                          </div>
                          <div className="text-xs font-semibold text-ink">{r.after.summary}</div>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{r.after.detail}</p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1">
                              {r.after.tags.map((tag) => (
                                <span key={tag} className="chip-brand">{tag}</span>
                              ))}
                            </div>
                            <span className="text-[11px] font-bold text-brand-700">GEO 멘션 {r.after.mentionCount}회</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {turns.length === 0 && (
              <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-ink-muted">
                아직 대화가 없습니다. 아래에 질문을 입력해 4 엔진 비교를 시작하세요.
              </div>
            )}
          </div>

          <div className="border-t border-border px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-ink-muted">추천 질문</span>
              {simulatorSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full border border-border bg-surface-base px-3 py-1.5 text-ink-soft hover:border-brand-200 hover:text-brand-700"
                >
                  ✨ {s}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border px-6 py-4">
            <form className="flex items-center gap-3" onSubmit={onSend}>
              <input
                className="input-base"
                placeholder="GEO 데이터를 학습한 AI에게 질문하세요. (Enter로 전송)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
                <Send className="h-4 w-4" /> {loading ? '비교 중…' : '전송'}
              </button>
            </form>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-ink-muted">
              <Sparkles className="h-3 w-3 text-brand" /> GEO 데이터 86% 적용 중 · 4 엔진 동시 호출
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
