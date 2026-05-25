'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, ClipboardCopy, FileText, ImageOff, Loader2, X } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

interface QueueItem {
  id: number | string;
  tenant_id: number | null;
  tenant_name: string;
  partner_slug: string | null;
  domain_category: string | null;
  channel: string | null;
  keyword_text: string | null;
  title: string | null;
  excerpt: string | null;
  body: string;
  slug: string | null;
  status: string | null;
  compliance_status: string | null;
  llm_provider: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  is_partner_content: boolean | null;
  partner_category: string | null;
  created_at: string;
  updated_at: string;
}

/** 본문에 cover image markdown 을 prepend 해 클립보드에 복사. */
function buildCopyPayload(q: QueueItem): string {
  const lines: string[] = [];
  if (q.cover_image_url) {
    const alt = (q.cover_image_alt || q.title || 'cover').replace(/[\[\]]/g, '');
    lines.push(`![${alt}](${q.cover_image_url})`);
    lines.push('');
  }
  if (q.title) {
    lines.push(`# ${q.title}`);
    lines.push('');
  }
  lines.push(q.body || '');
  return lines.join('\n');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CoverThumb({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-border bg-surface-subtle text-ink-muted">
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className="h-16 w-24 rounded-md border border-border bg-surface-subtle object-cover"
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}

function CoverHero({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className="h-auto w-full border-b border-border bg-surface-subtle object-cover"
      onError={() => setErrored(true)}
    />
  );
}

export default function ContentQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<QueueItem['id'] | null>(null);
  const [preview, setPreview] = useState<QueueItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content-queue', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setItems(data.items ?? []);
    } catch (e) {
      showToast(`큐 로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (q: QueueItem) => {
    setBusyId(q.id);
    try {
      const res = await fetch(`/api/admin/content-queue/${q.id}?action=approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'approve failed');
      const partnerNote = data.is_partner_content
        ? ` — /with-partners/${data.partner_category}/${q.partner_slug}/${data.slug || q.slug}`
        : '';
      showToast(`발행 승인됨${partnerNote}`);
      setItems((p) => p.filter((x) => x.id !== q.id));
      setPreview((cur) => (cur && cur.id === q.id ? null : cur));
    } catch (e) {
      showToast(`승인 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (q: QueueItem) => {
    if (!confirm('이 콘텐츠를 거부할까요? (status=rejected 로 표시, row 는 보존됨)')) return;
    setBusyId(q.id);
    try {
      const res = await fetch(`/api/admin/content-queue/${q.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'reject failed');
      showToast('거부됨 (rejected)', { kind: 'info' });
      setItems((p) => p.filter((x) => x.id !== q.id));
    } catch (e) {
      showToast(`거부 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const copyBody = async (q: QueueItem) => {
    const payload = buildCopyPayload(q);
    const ok = await copyToClipboard(payload);
    if (ok) {
      showToast(q.cover_image_url ? '본문 복사됨 (이미지 URL 포함)' : '본문 복사됨');
    } else {
      showToast('복사 실패', { kind: 'error' });
    }
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">콘텐츠 검수 큐 ({items.length})</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Supabase generated_contents 의 status=&apos;pending&apos; row 실시간 — 승인 시 published + partner 매핑
          </p>
        </div>
        <button onClick={() => void load()} className="btn-secondary text-xs">
          새로고침
        </button>
      </header>

      <div className="space-y-3">
        {loading && (
          <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
            검수 대기 큐가 비어 있습니다. 자동발행 cron 다음 사이클까지 대기.
          </div>
        )}
        {items.map((q) => (
          <div key={String(q.id)} className="card">
            <div className="flex items-start gap-4 border-b border-border px-5 py-3">
              <CoverThumb src={q.cover_image_url} alt={q.cover_image_alt || q.title || 'cover'} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip-brand">{q.tenant_name}</span>
                  {q.partner_slug && (
                    <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                      파트너 · {q.partner_slug}
                    </span>
                  )}
                  <span className="text-[11px] text-ink-muted">{q.llm_provider || q.channel || '?'}</span>
                  {q.keyword_text && (
                    <span className="text-[11px] text-ink-muted">· {q.keyword_text}</span>
                  )}
                </div>
                <h3 className="mt-1 text-sm font-bold text-ink">{q.title || '(제목 없음)'}</h3>
                <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                  {q.excerpt || (q.body ? q.body.replace(/<[^>]+>/g, '').slice(0, 180) : '')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
                  q.compliance_status === 'pass' ? 'bg-status-successSoft text-status-success' :
                  q.compliance_status === 'warn' ? 'bg-status-warningSoft text-status-warning' :
                  q.compliance_status === 'fail' ? 'bg-status-dangerSoft text-status-danger' :
                  'bg-surface-subtle text-ink-muted'
                )}>
                  {q.compliance_status === 'pass' ? '의료법 PASS' :
                   q.compliance_status === 'warn' ? '의료법 WARN' :
                   q.compliance_status === 'fail' ? '의료법 FAIL' :
                   '검수 대기'}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setPreview(q)} className="text-xs text-brand-700 hover:underline">
                  <FileText className="inline h-3.5 w-3.5" /> 본문 미리보기
                </button>
                <button onClick={() => copyBody(q)} className="text-xs text-brand-700 hover:underline">
                  <ClipboardCopy className="inline h-3.5 w-3.5" /> 본문 복사
                  {q.cover_image_url && <span className="ml-1 text-[10px] text-ink-muted">(+이미지)</span>}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => void reject(q)} disabled={busyId === q.id} className="btn-secondary text-xs">
                  <X className="h-3.5 w-3.5" /> 거부
                </button>
                <button onClick={() => void approve(q)} disabled={busyId === q.id} className="btn-primary text-xs">
                  {busyId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  발행 승인
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={() => setPreview(null)}>
          <div className="card w-full max-w-3xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">{preview.title || '(제목 없음)'}</h3>
              <button onClick={() => setPreview(null)} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <CoverHero src={preview.cover_image_url} alt={preview.cover_image_alt || preview.title || 'cover'} />
            <div className="px-6 py-5 text-sm leading-relaxed text-ink-soft">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <span>
                  {preview.tenant_name}
                  {preview.partner_slug ? ` · 파트너:${preview.partner_slug}` : ''}
                  {preview.domain_category ? ` · ${preview.domain_category}` : ''}
                  {preview.keyword_text ? ` · ${preview.keyword_text}` : ''}
                </span>
                <button onClick={() => void copyBody(preview)} className="text-brand-700 hover:underline">
                  <ClipboardCopy className="inline h-3.5 w-3.5" /> 본문 복사
                </button>
              </div>
              {/* 본문 — generated_contents.body 가 HTML 이면 그대로, plain text 면 wrap. */}
              {preview.body?.includes('<') ? (
                <article
                  className="prose prose-slate max-w-none prose-headings:text-ink prose-a:text-brand"
                  dangerouslySetInnerHTML={{ __html: preview.body }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{preview.body}</p>
              )}
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-surface-base/95 px-6 py-3 backdrop-blur">
              <button onClick={() => void reject(preview)} disabled={busyId === preview.id} className="btn-secondary text-xs">
                <X className="h-3.5 w-3.5" /> 거부
              </button>
              <button onClick={() => void approve(preview)} disabled={busyId === preview.id} className="btn-primary text-xs">
                {busyId === preview.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                발행 승인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
