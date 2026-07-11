'use client';

/**
 * CitationProof — AI 인용 "증거" 카드 (원장 미팅 무기).
 *
 * 우리가 측정해 저장한 실제 AI 답변에서 병원이 언급된 응답을 채팅 스타일 카드로 렌더.
 * 두 단계 구분:
 *   - [전체 언급] AI가 병원을 안다(흔함) — is_target 언급.
 *   - [📄 우리 콘텐츠 출처만] AI가 우리(위서클) 콘텐츠를 근거로 답했다(제품의 진짜 목표·현재 희소).
 * chatgpt.com 캡처가 아니라 DB 원본 답변 → 항상 재현·ToS 무관.
 */
import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, FileText, Loader2, Quote, ChevronDown, ChevronRight } from 'lucide-react';
import { readScope, SCOPE_EVENT, scopeToLang } from '@/components/admin/ScopeSelector';

interface ProofItem {
  response_id: number;
  engine: string;
  keyword: string;
  brand: string;
  snippet: string;
  answer: string;
  has_cites: boolean;
  self_cited: boolean;
  self_url: string | null;
  created_at: string;
}

const ENGINE_META: Record<string, { label: string; cls: string; dot: string }> = {
  gemini: { label: 'Gemini', cls: 'text-engine-gemini', dot: 'bg-engine-gemini' },
  openai: { label: 'ChatGPT', cls: 'text-engine-chatgpt', dot: 'bg-engine-chatgpt' },
  chatgpt: { label: 'ChatGPT', cls: 'text-engine-chatgpt', dot: 'bg-engine-chatgpt' },
  claude: { label: 'Claude', cls: 'text-engine-claude', dot: 'bg-engine-claude' },
  perplexity: { label: 'Perplexity', cls: 'text-engine-perplexity', dot: 'bg-engine-perplexity' },
};

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
  const [onlySelf, setOnlySelf] = useState(false);
  const [items, setItems] = useState<ProofItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    setScope(readScope());
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (typeof d === 'string') setScope(d);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);

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
    if (onlySelf) qs.set('only_self', '1');
    qs.set('limit', '12');
    try {
      const r = await fetch(`/api/admin/citation-proof?${qs.toString()}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || '불러오기 실패');
      setItems(j.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류');
    }
  }, [scope, tenant, onlySelf]);

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
        <div className="flex flex-wrap items-center gap-2">
          {/* 증거 강도 토글 */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-subtle p-0.5">
            <button
              type="button"
              onClick={() => setOnlySelf(false)}
              className={
                !onlySelf
                  ? 'rounded-md bg-ink px-2.5 py-1 text-[11px] font-bold text-white'
                  : 'rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:text-ink'
              }
            >
              전체 언급
            </button>
            <button
              type="button"
              onClick={() => setOnlySelf(true)}
              className={
                onlySelf
                  ? 'rounded-md bg-accent-deep px-2.5 py-1 text-[11px] font-bold text-white'
                  : 'rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:text-ink'
              }
            >
              📄 우리 콘텐츠 출처만
            </button>
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
        </div>
      </header>

      {err ? (
        <div className="px-5 py-8 text-center text-xs text-status-danger">불러오기 실패: {err}</div>
      ) : !items ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-[12px] text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 증거 로딩 중…
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-ink-muted">
          {onlySelf
            ? '아직 AI 가 우리(위서클) 콘텐츠를 출처로 인용한 답변이 없습니다 — 이게 바로 우리가 만들려는 것(콘텐츠 발행·최적화로 여기를 채웁니다).'
            : '이 조건에서 아직 인용 증거가 없습니다. (측정 cron 누적 후 표시)'}
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
                className={`flex flex-col rounded-2xl border bg-surface-base p-4 ${
                  it.self_cited ? 'border-accent-deep ring-1 ring-accent-deep/30' : 'border-border'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
                    <span className={`h-2 w-2 rounded-full ${em.dot}`} />
                    <span className={em.cls}>{em.label}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-ink-faint">
                    {it.self_cited ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 font-bold text-accent-deep">
                        <FileText className="h-3 w-3" /> 우리 콘텐츠 인용
                      </span>
                    ) : it.has_cites ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-status-successSoft px-1.5 py-0.5 font-bold text-status-success">
                        <BadgeCheck className="h-3 w-3" /> 출처 인용
                      </span>
                    ) : null}
                    {new Date(it.created_at).toISOString().slice(0, 10)}
                  </span>
                </div>

                <div className="mb-2 text-[11px] text-ink-muted">
                  <span className="font-semibold text-ink-soft">질문</span> · “{it.keyword}”
                </div>

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

                {/* 자사 출처 URL — 제품의 핵심 증거 */}
                {it.self_cited && it.self_url && (
                  <a
                    href={it.self_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 truncate text-[11px] font-semibold text-accent-deep hover:underline"
                    title={it.self_url}
                  >
                    <FileText className="h-3 w-3 shrink-0" /> 인용된 우리 콘텐츠: {it.self_url}
                  </a>
                )}

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

      <div className="border-t border-border bg-surface-subtle/50 px-4 py-2 text-[10px] leading-relaxed text-ink-muted md:px-5">
        💡 <strong className="text-ink">전체 언급</strong> = AI 가 병원을 안다(흔함) · <strong className="text-accent-deep">우리 콘텐츠 출처</strong> = AI 가 우리가 만든 글로 답한다(제품의 목표). 후자를 늘리는 게 핵심.
      </div>
    </section>
  );
}
