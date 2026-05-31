'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Check, ClipboardCopy, Edit3, ExternalLink, Eye, FileText,
  ImageOff, Loader2, MessageSquare, Save, X
} from 'lucide-react';
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
  published_at: string | null;
  live_url: string | null;
  view_count: number | null;
  citation_count: number | null;
}

type TabKey = 'pending' | 'published';

const PARTNER_CATEGORY_KO: Record<string, string> = {
  eyeclinic: '안과',
  derma: '피부과',
  plastic: '성형외과',
  dental: '치과',
  internal: '내과',
  hair: '모발이식'
};

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
    <img src={src} alt={alt}
      className="h-16 w-24 rounded-md border border-border bg-surface-subtle object-cover"
      loading="lazy" onError={() => setErrored(true)} />
  );
}

function CoverHero({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={src} alt={alt}
      className="h-auto w-full border-b border-border bg-surface-subtle object-cover"
      onError={() => setErrored(true)} />
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function ContentManagementPage() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [published, setPublished] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<QueueItem['id'] | null>(null);
  const [preview, setPreview] = useState<QueueItem | null>(null);
  // Round 18 (2026-05-28): 미리보기 모달 안 인라인 편집 모드
  const [editing, setEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const load = useCallback(async (which: TabKey | 'both' = 'both') => {
    setLoading(true);
    try {
      const fetchOne = async (status: TabKey) => {
        const res = await fetch(`/api/admin/content-queue?status=${status}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
        return (data.items ?? []) as QueueItem[];
      };
      if (which === 'both' || which === 'pending') setPending(await fetchOne('pending'));
      if (which === 'both' || which === 'published') setPublished(await fetchOne('published'));
    } catch (e) {
      showToast(`목록 로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load('both'); }, [load]);

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
      setPreview((cur) => (cur && cur.id === q.id ? null : cur));
      await load('both');
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
      showToast('거부됨', { kind: 'info' });
      await load('both');
    } catch (e) {
      showToast(`거부 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const copyBody = async (q: QueueItem) => {
    const ok = await copyToClipboard(buildCopyPayload(q));
    showToast(ok
      ? (q.cover_image_url ? '본문 복사됨 (이미지 URL 포함)' : '본문 복사됨')
      : '복사 실패', { kind: ok ? 'success' : 'error' });
  };

  // Round 18 — 인라인 편집 진입 / 저장 / 취소
  const startEdit = (q: QueueItem) => {
    setEditTitle(q.title ?? '');
    setEditBody(q.body ?? '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditTitle('');
    setEditBody('');
  };

  const saveEdit = async (q: QueueItem) => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/content-queue/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, body: editBody })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'edit failed');
      // 모달 안 preview 즉시 반영
      setPreview((cur) => (cur && cur.id === q.id ? { ...cur, title: editTitle, body: editBody } : cur));
      showToast('수정 저장됨');
      setEditing(false);
      await load('both');
    } catch (e) {
      showToast(`수정 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">콘텐츠 관리</h1>
        </div>
        <button onClick={() => void load('both')} className="btn-secondary text-xs">새로고침</button>
      </header>

      {/* === 탭 헤더 === */}
      <div className="mb-5 flex items-center border-b border-border">
        <button
          onClick={() => setTab('pending')}
          className={cn(
            'relative px-4 py-2.5 text-sm font-semibold transition',
            tab === 'pending' ? 'text-brand' : 'text-ink-muted hover:text-ink'
          )}
        >
          콘텐츠 검수
          <span className={cn(
            'ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px]',
            tab === 'pending' ? 'bg-brand/15 text-brand' : 'bg-surface-subtle text-ink-muted'
          )}>{pending.length}</span>
          {tab === 'pending' && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t bg-brand" />}
        </button>
        <button
          onClick={() => setTab('published')}
          className={cn(
            'relative px-4 py-2.5 text-sm font-semibold transition',
            tab === 'published' ? 'text-brand' : 'text-ink-muted hover:text-ink'
          )}
        >
          콘텐츠 완료
          <span className={cn(
            'ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px]',
            tab === 'published' ? 'bg-brand/15 text-brand' : 'bg-surface-subtle text-ink-muted'
          )}>{published.length}</span>
          {tab === 'published' && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t bg-brand" />}
        </button>
      </div>

      {/* === 탭 콘텐츠 === */}
      {loading ? (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
        </div>
      ) : tab === 'pending' ? (
        <PendingTab
          items={pending}
          busyId={busyId}
          onPreview={setPreview}
          onApprove={approve}
          onReject={reject}
          onCopy={copyBody}
        />
      ) : (
        <PublishedTab items={published} />
      )}

      {/* === 본문 미리보기 + 인라인 편집 모달 === */}
      {preview && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4"
          onClick={() => { if (!editing) { setPreview(null); cancelEdit(); } }}
        >
          <div className="card w-full max-w-3xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              {editing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목"
                  className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none"
                />
              ) : (
                <h3 className="text-base font-bold text-ink">{preview.title || '(제목 없음)'}</h3>
              )}
              <button
                onClick={() => { setPreview(null); cancelEdit(); }}
                className="ml-3 rounded-md p-1 text-ink-muted hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!editing && (
              <CoverHero src={preview.cover_image_url} alt={preview.cover_image_alt || preview.title || 'cover'} />
            )}
            <div className="px-6 py-5 text-sm leading-relaxed text-ink-soft">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <span>
                  {preview.tenant_name}
                  {preview.partner_slug ? ` · 파트너:${preview.partner_slug}` : ''}
                  {preview.domain_category ? ` · ${preview.domain_category}` : ''}
                  {preview.keyword_text ? ` · ${preview.keyword_text}` : ''}
                </span>
                {!editing && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(preview)} className="text-brand-700 hover:underline">
                      <Edit3 className="inline h-3.5 w-3.5" /> 편집
                    </button>
                    <button onClick={() => void copyBody(preview)} className="text-brand-700 hover:underline">
                      <ClipboardCopy className="inline h-3.5 w-3.5" /> 본문 복사
                    </button>
                  </div>
                )}
              </div>
              {editing ? (
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="본문 HTML"
                  rows={20}
                  className="block w-full rounded-md border border-border bg-surface-subtle px-3 py-3 font-mono text-xs text-ink focus:border-brand focus:outline-none"
                  spellCheck={false}
                />
              ) : preview.body?.includes('<') ? (
                <article
                  className="prose prose-slate max-w-none prose-headings:text-ink prose-a:text-brand"
                  dangerouslySetInnerHTML={{ __html: preview.body }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{preview.body}</p>
              )}
            </div>
            <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-surface-base/95 px-6 py-3 backdrop-blur">
              {editing ? (
                <>
                  <button onClick={cancelEdit} disabled={savingEdit} className="btn-secondary text-xs">
                    <X className="h-3.5 w-3.5" /> 취소
                  </button>
                  <button onClick={() => void saveEdit(preview)} disabled={savingEdit} className="btn-primary text-xs">
                    {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    저장
                  </button>
                </>
              ) : preview.status === 'pending' ? (
                <>
                  <button onClick={() => void reject(preview)} disabled={busyId === preview.id} className="btn-secondary text-xs">
                    <X className="h-3.5 w-3.5" /> 거부
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => void approve(preview)} disabled={busyId === preview.id} className="btn-primary text-xs">
                      {busyId === preview.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      발행 승인
                    </button>
                  </div>
                </>
              ) : (
                <span className="text-xs text-ink-muted">발행 완료 콘텐츠 — 편집은 가능, 발행 상태 유지</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── 검수 탭 (카드 list) ─────────────────────── */

function PendingTab({
  items, busyId, onPreview, onApprove, onReject, onCopy
}: {
  items: QueueItem[];
  busyId: QueueItem['id'] | null;
  onPreview: (q: QueueItem) => void;
  onApprove: (q: QueueItem) => void;
  onReject: (q: QueueItem) => void;
  onCopy: (q: QueueItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
        검수 대기 큐가 비어 있습니다. 자동발행 cron 다음 사이클까지 대기.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((q) => (
        <div key={String(q.id)} className="card">
          <div className="flex items-start gap-4 border-b border-border px-5 py-3">
            <CoverThumb src={q.cover_image_url} alt={q.cover_image_alt || q.title || 'cover'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip-brand">{q.tenant_name}</span>
                {/* Round 30 (2026-05-30): is_partner_content 분기. 자사 글은 '자사' 칩, 파트너 글은 'partner · slug' 칩. */}
                {q.is_partner_content === false ? (
                  <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                    자사
                  </span>
                ) : q.partner_slug ? (
                  <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                    파트너 · {q.partner_slug}
                  </span>
                ) : null}
                <span className="text-[11px] text-ink-muted">{q.llm_provider || q.channel || '?'}</span>
                {q.keyword_text && <span className="text-[11px] text-ink-muted">· {q.keyword_text}</span>}
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
                 q.compliance_status === 'fail' ? '의료법 FAIL' : '검수 대기'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => onPreview(q)} className="text-xs text-brand-700 hover:underline">
                <FileText className="inline h-3.5 w-3.5" /> 본문 미리보기
              </button>
              <button onClick={() => onCopy(q)} className="text-xs text-brand-700 hover:underline">
                <ClipboardCopy className="inline h-3.5 w-3.5" /> 본문 복사
                {q.cover_image_url && <span className="ml-1 text-[10px] text-ink-muted">(+이미지)</span>}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onReject(q)} disabled={busyId === q.id} className="btn-secondary text-xs">
                <X className="h-3.5 w-3.5" /> 거부
              </button>
              <button onClick={() => onApprove(q)} disabled={busyId === q.id} className="btn-primary text-xs">
                {busyId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                발행 승인
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── 완료 탭 (테이블 list) ─────────────────────── */

function PublishedTab({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
        아직 발행 완료된 파트너 콘텐츠가 없습니다.
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      {/* Round 48 — 모바일 대응 가로 스크롤 wrap */}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <tr>
            <th className="px-4 py-3 text-left">진료항목</th>
            <th className="px-4 py-3 text-left">클라이언트</th>
            <th className="px-4 py-3 text-left">제목</th>
            <th className="px-4 py-3 text-left">발행일</th>
            <th className="px-4 py-3 text-right">조회수</th>
            <th className="px-4 py-3 text-right">AI 인용</th>
            <th className="px-4 py-3 text-right">라이브</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => {
            const ko = q.partner_category ? PARTNER_CATEGORY_KO[q.partner_category] ?? q.partner_category : '—';
            return (
              <tr key={String(q.id)} className="border-t border-border hover:bg-surface-subtle">
                <td className="px-4 py-3 text-xs font-semibold text-brand-700">{ko}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{q.tenant_name}</div>
                  {/* Round 30 (2026-05-30): 자사면 '자사' 라벨, 파트너면 partner_slug 라벨 */}
                  {q.is_partner_content === false ? (
                    <div className="text-[10px] font-mono text-brand">자사</div>
                  ) : q.partner_slug ? (
                    <div className="text-[10px] font-mono text-ink-muted">{q.partner_slug}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 max-w-md">
                  <div className="line-clamp-1 text-sm text-ink">{q.title || '(제목 없음)'}</div>
                  {q.keyword_text && (
                    <div className="line-clamp-1 text-[11px] text-ink-muted">{q.keyword_text}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">{fmtDate(q.published_at)}</td>
                <td className="px-4 py-3 text-right text-xs font-mono">
                  {q.view_count == null ? (
                    <span className="inline-flex items-center gap-1 text-ink-muted" title="페이지뷰 파이프라인 미연결">
                      <Eye className="h-3 w-3" /> —
                    </span>
                  ) : (
                    q.view_count.toLocaleString()
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs font-mono">
                  {q.citation_count == null ? (
                    <span className="inline-flex items-center gap-1 text-ink-muted" title="AI 인용 추적 미연결">
                      <MessageSquare className="h-3 w-3" /> —
                    </span>
                  ) : (
                    q.citation_count.toLocaleString()
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {q.live_url ? (
                    <Link href={q.live_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
                      열기 <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="border-t border-border bg-surface-subtle px-4 py-2.5 text-[11px] text-ink-muted">
        조회수 / AI 인용 컬럼은 데이터 파이프라인 연결 후 자동 표시 (GA4 + /admin/citations 통합 예정)
      </div>
    </div>
  );
}
