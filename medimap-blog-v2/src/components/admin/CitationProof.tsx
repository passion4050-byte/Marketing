'use client';

/**
 * CitationProof — AI 인용 "증거" 카드 (원장 미팅 무기).
 *
 * 우리가 측정해 저장한 실제 AI 답변에서 병원이 언급된 응답을 채팅 스타일 카드로 렌더.
 * 엔진 배지 + 질문 + AI 답변(병원명 하이라이트) + 날짜. 병원 선택 드롭다운 + 전역 언어 스코프 구독.
 * "이게 그날 ChatGPT/Gemini 가 실제로 답한 내용이고, 여기 병원명이 나옵니다" — 눈으로 꽂히는 증거.
 */
import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Loader2, Quote, ChevronDown, ChevronRight } from 'lucide-react';
import { readScope, SCOPE_EVENT, scopeToLang } from '@/components/admin/ScopeSelector';

interface ProofItem {
  response_id: number;
  engine: string;
  keyword: string;
  brand: string;
  snippet: string;
  answer: string;
  has_cites: boolean;
  created_at: string;
}

const ENGINE_META: Record<string, { label: string; cls: string; dot: string }> = {
  gemini: { label: 'Gemini', cls: 'text-engine-gemini', dot: 'bg-engine-gemini' },
  openai: { label: 'ChatGPT', cls: 'text-engine-chatgpt', dot: 'bg-engine-chatgpt' },
  chatgpt: { label: 'ChatGPT', cls: 'text-engine-chatgpt', dot: 'bg-engine-chatgpt' },
  claude: { label: 'Claude', cls: 'text-engine-claude', dot: 'bg-engine-claude' },
  perplexity: { label: 'Perplexity', cls: 'text-engine-perplexity', dot: 'bg-engine-perplexity' },
};

/** 텍스트에서 brand 를 하이라이트한 조각 배열로 분할(대소문자 무시). */
function highlight(text: string, brand: string): Array<{ t: string; hit: boolean }> {
  if (!brand) return [{ t: text, hit: false }];
  const parts: Array<{ t: string; hit: boolean }> = [];
  const low = text.toLowerCase();
  const b = brand.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const idx = low.indexOf(b, i);
    if (idx === -1) {
      parts.push({ t: text.slice(i), hit: false });
      break;
    }
    if (idx > i) parts.push({ t: text.slice(i, idx), hit: false });
    parts.push({ t: text.slice(idx, idx + brand.length), hit: true });
    i = idx + brand.length;
  }
  return parts;
}

export function CitationProof() {
  const [scope, setScope] = useState('all');
  const [tenants, setTenants] = useState<Array<{ id: number; name: string }>>([]);
  const [tenant, setTenant] = useState<string>('');
  const [items, setItems] = useState<ProofItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  // 전역 언어 스코프 구독
  useEffect(() => {
    setScope(readScope());
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (typeof d === 'string') setScope(d);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);

  // 병원 목록(드롭다운)
  useEffect(() => {
    fetch('/api/admin/tenants', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setTenants((j.tenants ?? []).map((t: { id: number; name: string }) => ({ id: t.id, name: t.name })));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setItems(null);
    setErr(null);
    const langParam = scopeToLang(scope);
    const qs = new URLSearchParams();
    if (tenant) qs.set('tenant', tenant);
    if (langParam) qs.set('lang', langParam);
    qs.set('limit', '12');
    try {
      const r = await fetch(`/api/admin/citation-proof?${qs.toString()}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || '불러오기 실패');
      setItems(j.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류');
    }
  }, [scope, tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card mt-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Quote className="h-4 w-4 text-ink-soft" />
            AI 인용 증거 — 실제 답변 캡처
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            AI 가 실제로 답한 원문에서 병원이 언급된 순간 — 원장 미팅용 증거 카드
          </div>
        </div>
        <select
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          className="h-8 rounded-lg border border-border bg-surface-base px-2 text-xs text-ink-soft"
          aria-label="병원 선택"
        >
          <option value="">전체 병원</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </header>

      {err ? (
        <div className="px-5 py-8 text-center text-xs text-status-danger">불러오기 실패: {err}</div>
      ) : !items ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-[12px] text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 증거 로딩 중…
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-ink-muted">
          이 조건에서 아직 인용 증거가 없습니다. (측정 cron 누적 후 표시)
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          {items.map((it) => {
            const em = ENGINE_META[it.engine] ?? { label: it.engine, cls: 'text-ink', dot: 'bg-ink-faint' };
            const expanded = open === it.response_id;
            const body = expanded ? it.answer : it.snippet;
            return (
              <div
                key={it.response_id}
                className="flex flex-col rounded-2xl border border-border bg-surface-base p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
              >
                {/* 헤더: 엔진 + 날짜 + 인용 배지 */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
                    <span className={`h-2 w-2 rounded-full ${em.dot}`} />
                    <span className={em.cls}>{em.label}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-ink-faint">
                    {it.has_cites && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-status-successSoft px-1.5 py-0.5 font-bold text-status-success">
                        <BadgeCheck className="h-3 w-3" /> 출처 인용
                      </span>
                    )}
                    {new Date(it.created_at).toISOString().slice(0, 10)}
                  </span>
                </div>

                {/* 질문 */}
                <div className="mb-2 text-[11px] text-ink-muted">
                  <span className="font-semibold text-ink-soft">질문</span> · “{it.keyword}”
                </div>

                {/* AI 답변 (병원명 하이라이트) */}
                <div className="rounded-xl bg-surface-subtle px-3 py-2.5 text-[13px] leading-relaxed text-ink">
                  {highlight(body, it.brand).map((p, i) =>
                    p.hit ? (
                      <mark key={i} className="rounded bg-accent-soft px-0.5 font-bold text-accent-deep">
                        {p.t}
                      </mark>
                    ) : (
                      <span key={i}>{p.t}</span>
                    ),
                  )}
                </div>

                {/* 전체 답변 토글 */}
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : it.response_id)}
                  className="mt-2 inline-flex items-center gap-1 self-start text-[11px] font-semibold text-ink-muted transition hover:text-ink"
                >
                  {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {expanded ? '접기' : '전체 답변 보기'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border bg-surface-subtle/50 px-4 py-2 text-[10px] text-ink-muted md:px-5">
        💡 미팅 팁: 병원 선택 후 좋은 카드를 화면에 띄우고 스크린샷 — “AI 가 실제로 이렇게 답합니다”가 어떤 지표보다 강합니다.
      </div>
    </section>
  );
}
