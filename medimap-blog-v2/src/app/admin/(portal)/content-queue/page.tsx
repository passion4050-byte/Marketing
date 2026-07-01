'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Check, ClipboardCopy, Edit3, ExternalLink, Eye, FileText,
  ImageOff, Loader2, MessageSquare, Save, X
} from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';
import type { ContentQuality } from '@/lib/contentQuality';

/** Round 81 — 구조 품질 점수 뱃지 (A/B/C/D + 점수, hover 시 부족 항목). */
function QualityBadge({ quality, compact = false }: { quality: ContentQuality | null; compact?: boolean }) {
  if (!quality) return null;
  const tone =
    quality.grade === 'A' ? 'bg-status-successSoft text-status-success'
    : quality.grade === 'B' ? 'bg-brand-50 text-brand'
    : quality.grade === 'C' ? 'bg-status-warningSoft text-status-warning'
    : 'bg-status-dangerSoft text-status-danger';
  const tip = quality.missing.length
    ? `구조 점수 ${quality.score} · 부족: ${quality.missing.join(', ')}`
    : `구조 점수 ${quality.score} · 모든 AEO 요소 충족 ✓`;
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold', tone)}
      title={tip}
    >
      품질 {quality.grade}
      {!compact && <span className="font-semibold opacity-80">{quality.score}</span>}
    </span>
  );
}

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
  quality: ContentQuality | null;
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

function CoverThumb({ src, alt, channel }: { src: string | null; alt: string; channel?: string | null }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    // Round 79 — FAQ(schema_org)는 이미지가 원래 없음 → 깨진 아이콘 대신 FAQ 표시
    if (channel === 'schema_org') {
      return (
        <div className="flex h-16 w-24 flex-col items-center justify-center rounded-md border border-brand/20 bg-brand-50/40 text-brand">
          <MessageSquare className="h-4 w-4" />
          <span className="mt-0.5 text-[9px] font-bold">FAQ</span>
        </div>
      );
    }
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

/**
 * Round 105-b (2026-06-29) — CoverHero + 재생성 버튼 오버레이.
 * 사용자 요구: "이미지별로 재생성 버튼 있으면 부분별로 재생성 가능".
 */
function CoverHero({
  src,
  alt,
  contentId,
  onRegenerated,
}: {
  src: string | null;
  alt: string;
  contentId?: number | string;
  onRegenerated?: (newUrl: string) => void;
}) {
  const [errored, setErrored] = useState(false);
  const [busy, setBusy] = useState(false);
  const regenerate = async () => {
    if (!contentId || busy) return;
    if (!confirm('DALL-E 3 로 커버 이미지를 재생성할까요? (한국인 모델, 20~40초 소요)')) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/content-queue/${contentId}/regenerate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetIndex: 0 }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.url) {
        showToast(`✅ 커버 재생성 성공`, 'success');
        onRegenerated?.(j.url);
      } else {
        showToast(`❌ 재생성 실패: ${j?.error || r.status} — ${j?.hint || ''}`, 'error');
      }
    } catch (e) {
      showToast(`❌ 재생성 예외: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };
  if (!src || errored) {
    if (!contentId) return null;
    return (
      <div className="flex h-40 items-center justify-center border-b border-border bg-surface-subtle">
        <button onClick={regenerate} disabled={busy} className="btn-primary text-xs">
          {busy ? '재생성 중… (20~40초)' : '🎨 커버 이미지 DALL-E 생성'}
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-auto w-full border-b border-border bg-surface-subtle object-cover"
        onError={() => setErrored(true)}
      />
      {contentId && (
        <button
          onClick={regenerate}
          disabled={busy}
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-black/90 disabled:opacity-60"
          title="DALL-E 3 로 커버 재생성 (한국인 모델)"
        >
          {busy ? '⏳ 재생성 중…' : '🔄 커버 재생성'}
        </button>
      )}
    </div>
  );
}

/**
 * Round 105-b — 본문 HTML 렌더 + 각 <img> 에 재생성 버튼 오버레이.
 *
 * dangerouslySetInnerHTML 로 렌더된 img 에 React 로 버튼 붙일 수 없어,
 * useEffect 에서 DOM 스캔 → 각 img 를 relative wrapper 로 감싸고 버튼 append.
 * 버튼 클릭 → API 호출 → 성공 시 img.src 즉시 갱신 + 부모 state sync.
 */
function BodyWithImageRegen({
  html,
  contentId,
  onImgRegenerated,
}: {
  html: string;
  contentId: number | string;
  onImgRegenerated: (index: number, newUrl: string) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    const cleanup: Array<() => void> = [];

    imgs.forEach((img, i) => {
      const targetIndex = i + 1; // 1-based (0 은 cover 예약)
      // 이미 wrapper 있으면 skip (재렌더링 케이스)
      if (img.parentElement?.dataset?.imgRegenWrapper === '1') return;

      const wrapper = document.createElement('div');
      wrapper.dataset.imgRegenWrapper = '1';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'block';
      wrapper.style.margin = '1rem 0';
      const parent = img.parentNode;
      if (!parent) return;
      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `🔄 이미지 ${targetIndex} 재생성`;
      btn.style.cssText =
        'position:absolute;right:8px;top:8px;padding:6px 12px;font-size:11px;font-weight:600;' +
        'color:white;background:rgba(0,0,0,0.72);border:none;border-radius:9999px;cursor:pointer;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.25);backdrop-filter:blur(4px);z-index:10;';
      btn.onmouseenter = () => (btn.style.background = 'rgba(0,0,0,0.92)');
      btn.onmouseleave = () => (btn.style.background = 'rgba(0,0,0,0.72)');
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`본문 ${targetIndex}번째 이미지를 DALL-E 3 로 재생성할까요? (한국인 모델, 20~40초 소요)`)) return;
        btn.disabled = true;
        const orig = btn.textContent;
        btn.textContent = '⏳ 재생성 중…';
        try {
          const r = await fetch(`/api/admin/content-queue/${contentId}/regenerate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetIndex }),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j?.url) {
            img.src = j.url;
            onImgRegenerated(targetIndex, j.url);
            btn.textContent = '✅ 완료';
            setTimeout(() => {
              btn.textContent = orig;
            }, 2500);
          } else {
            alert(`재생성 실패: ${j?.error || r.status} — ${j?.hint || ''}`);
            btn.textContent = orig;
          }
        } catch (e) {
          alert(`재생성 예외: ${e instanceof Error ? e.message : String(e)}`);
          btn.textContent = orig;
        } finally {
          btn.disabled = false;
        }
      };
      wrapper.appendChild(btn);

      cleanup.push(() => {
        try {
          if (wrapper.parentNode && img.parentNode === wrapper) {
            wrapper.parentNode.insertBefore(img, wrapper);
          }
          wrapper.remove();
        } catch {}
      });
    });

    return () => cleanup.forEach((fn) => fn());
    // html 이 바뀌면 재실행 (dangerouslySetInnerHTML 이 DOM 을 재구성)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, contentId]);

  return (
    <article
      ref={ref as React.RefObject<HTMLDivElement>}
      className="db-html-content mx-auto max-w-[680px] text-[15px] leading-[1.85]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">콘텐츠 관리</h1>
          <p className="admin-page-desc">검수 대기 + 발행 완료 콘텐츠를 편집하고 AI 인용 효과를 확인합니다</p>
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
      {preview && (() => {
        // Round 59 fix 5 — modal 가독성 개선
        const previewIsSelf = isSelfContent(preview);
        const wordCount = preview.body
          ? preview.body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length
          : 0;
        const readingMin = Math.max(1, Math.ceil(wordCount / 300));
        const charCount = preview.body ? preview.body.replace(/<[^>]+>/g, '').length : 0;
        return (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
          onClick={() => { if (!editing) { setPreview(null); cancelEdit(); } }}
        >
          <div className="card relative w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Round 59 fix 5 — 좌측 4px stripe (자사/파트너 색상) */}
            <div className={cn('absolute inset-y-0 left-0 w-1 z-10', previewIsSelf ? 'bg-brand' : 'bg-accent')} />

            {/* Sticky header — 자사/파트너 chip + 제목 + 닫기 */}
            <div className="sticky top-0 z-10 border-b border-border bg-surface-base px-6 py-4 pl-7">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {previewIsSelf ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                    🏢 자사 인사이트
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                    🏥 파트너 병원
                  </span>
                )}
                <span className="text-[12px] font-semibold text-ink">{preview.tenant_name}</span>
                {!previewIsSelf && preview.partner_slug && (
                  <span className="font-mono text-[10px] text-ink-muted">@{preview.partner_slug}</span>
                )}
                {preview.domain_category && (
                  <span className="rounded bg-surface-soft px-1.5 py-0.5 text-[10px] text-ink-muted">{preview.domain_category}</span>
                )}
                {preview.keyword_text && (
                  <span className="text-[10px] text-ink-muted">· 키워드: {preview.keyword_text}</span>
                )}
                <span className="ml-auto text-[10px] text-ink-faint">
                  📝 {charCount.toLocaleString()}자 · ⏱️ {readingMin}분
                  {preview.quality && (
                    <span className="ml-1 text-ink-muted">
                      · H2 {preview.quality.breakdown.h2}(질문 {preview.quality.breakdown.questionH2})
                      · 표 {preview.quality.breakdown.tables} · 목록 {preview.quality.breakdown.lists}
                      · 이미지 {preview.quality.breakdown.images}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                {editing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="제목"
                    className="flex-1 rounded-md border border-border px-3 py-1.5 text-base font-bold text-ink focus:border-brand focus:outline-none"
                  />
                ) : (
                  <h3 className="text-lg font-bold leading-tight text-ink">{preview.title || '(제목 없음)'}</h3>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  {!editing && (
                    <>
                      <button onClick={() => startEdit(preview)} className="rounded-md border border-border bg-surface-base px-2 py-1 text-[11px] font-semibold text-ink-soft hover:bg-surface-subtle">
                        <Edit3 className="inline h-3 w-3" /> 편집
                      </button>
                      <button onClick={() => void copyBody(preview)} className="rounded-md border border-border bg-surface-base px-2 py-1 text-[11px] font-semibold text-ink-soft hover:bg-surface-subtle">
                        <ClipboardCopy className="inline h-3 w-3" /> 복사
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setPreview(null); cancelEdit(); }}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-surface-subtle"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* 메타 정보 — compliance status + llm provider */}
              <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-muted">
                <span className={cn(
                  'inline-flex rounded-full px-1.5 py-0 font-bold',
                  preview.compliance_status === 'pass' ? 'bg-status-successSoft text-status-success' :
                  preview.compliance_status === 'warn' ? 'bg-status-warningSoft text-status-warning' :
                  preview.compliance_status === 'fail' ? 'bg-status-dangerSoft text-status-danger' :
                  'bg-surface-subtle'
                )}>
                  {preview.compliance_status === 'pass' ? '의료법 PASS' :
                   preview.compliance_status === 'warn' ? '의료법 WARN' :
                   preview.compliance_status === 'fail' ? '의료법 FAIL' : '검수 대기'}
                </span>
                {preview.quality && (
                  <>
                    <span>·</span>
                    <QualityBadge quality={preview.quality} />
                  </>
                )}
                <span>·</span>
                <span className="font-mono">{preview.llm_provider || preview.channel}</span>
                <span>·</span>
                <span>#{preview.id}</span>
                {preview.live_url && (
                  <>
                    <span>·</span>
                    <a href={preview.live_url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                      라이브 URL ↗
                    </a>
                  </>
                )}
              </div>
            </div>

            {!editing && (
              <CoverHero
                src={preview.cover_image_url}
                alt={preview.cover_image_alt || preview.title || 'cover'}
                contentId={preview.id}
                onRegenerated={(newUrl) => {
                  setPreview((cur) => (cur && cur.id === preview.id ? { ...cur, cover_image_url: newUrl } : cur));
                }}
              />
            )}

            {/* Round 59 fix 5 — 본문 가독성 강화: 더 큰 폰트, 좁은 max-width, 충분한 line-height */}
            <div className="bg-surface-base px-6 py-6 pl-7 md:px-10 md:pl-11">
              {editing ? (
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="본문 HTML"
                  rows={24}
                  className="block w-full rounded-md border border-border bg-surface-subtle px-3 py-3 font-mono text-xs leading-relaxed text-ink focus:border-brand focus:outline-none"
                  spellCheck={false}
                />
              ) : preview.body && (preview.body.includes('application/ld+json') || preview.body.trim().startsWith('{')) ? (
                <FaqPreview body={preview.body} />
              ) : preview.body?.includes('<') ? (
                <BodyWithImageRegen
                  html={preview.body}
                  contentId={preview.id}
                  onImgRegenerated={(index, newUrl) => {
                    // body 내 N번째 img src 만 갱신 (DB 는 이미 API 가 갱신했으니 preview state 만 sync)
                    setPreview((cur) => {
                      if (!cur || cur.id !== preview.id) return cur;
                      let i = 0;
                      const updated = cur.body.replace(
                        /(<img\b[^>]*\bsrc\s*=\s*")([^"]+)("[^>]*>)/gi,
                        (m, pre, oldSrc, post) => {
                          i += 1;
                          return i === index ? `${pre}${newUrl}${post}` : m;
                        },
                      );
                      return { ...cur, body: updated };
                    });
                  }}
                />
              ) : preview.body ? (
                <p className="mx-auto max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.85] text-ink-soft">{preview.body}</p>
              ) : (
                <div className="mx-auto max-w-[680px] py-10 text-center text-sm text-ink-muted">
                  본문이 비어 있습니다. (FAQ 스키마 콘텐츠는 raw_qa_pairs 를 참조하세요)
                </div>
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
        );
      })()}
    </div>
  );
}

/* ─────────────────────── FAQ(JSON-LD) 미리보기 ─────────────────────── */
// Round 74 — schema_org 콘텐츠 body 가 JSON-LD 라 raw 로 보이던 문제 → Q&A 로 렌더.
function FaqPreview({ body }: { body: string }) {
  // body 가 <script type="application/ld+json"> 래핑이면 그 안의 JSON 만 추출
  const m = body.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i);
  const jsonStr = (m ? m[1] : body).trim();
  let pairs: Array<{ q: string; a: string }> = [];
  try {
    const data = JSON.parse(jsonStr) as { mainEntity?: unknown };
    const entities = Array.isArray(data.mainEntity) ? data.mainEntity : [];
    pairs = entities
      .map((e) => ({
        q: (e as { name?: string })?.name ?? '',
        a: (e as { acceptedAnswer?: { text?: string } })?.acceptedAnswer?.text ?? '',
      }))
      .filter((p) => p.q || p.a);
  } catch {
    // parse 실패 → raw 표시
  }
  if (pairs.length === 0) {
    return (
      <pre className="mx-auto max-w-[680px] overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-subtle p-4 text-[12px] leading-relaxed text-ink-soft">
        {jsonStr}
      </pre>
    );
  }
  return (
    <div className="mx-auto max-w-[680px] space-y-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
        FAQ 스키마 콘텐츠 · {pairs.length}문항
      </div>
      {pairs.map((p, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <div className="mb-1.5 flex gap-2 text-[15px] font-bold text-ink">
            <span className="shrink-0 text-brand">Q.</span>
            <span>{p.q}</span>
          </div>
          <div className="flex gap-2 text-[14px] leading-[1.8] text-ink-soft">
            <span className="shrink-0 font-bold text-accent">A.</span>
            <span className="whitespace-pre-wrap">{p.a}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── 검수 탭 (카드 list) ─────────────────────── */

// Round 59 fix 5 (2026-06-01) — UIUX 완벽 개선:
// (1) is_partner_content 무시, partner_slug 기반 정확 분기 (cron 의 잘못된 마킹 우회)
// (2) 카드 좌측 4px stripe — 자사(brand) / 파트너(accent) 색상 구분
// (3) 카테고리 필터 chip (전체 / 자사 / 파트너) — 검수 효율
// (4) 파트너 글은 병원명을 진료과 라벨로 강조
function isSelfContent(q: QueueItem): boolean {
  const slug = q.partner_slug ?? '';
  return slug === 'medimap' || slug === 'medimap-self' || (slug === '' && !q.is_partner_content);
}

type ContentFilter = 'all' | 'self' | 'partner';

// Round 77 — 카드 본문 미리줄. FAQ(JSON-LD)면 raw JSON 대신 첫 질문들을 표시.
function cardExcerpt(q: QueueItem): string {
  const body = q.body ?? '';
  if (body.includes('application/ld+json') || body.trim().startsWith('{')) {
    const m = body.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i);
    const jsonStr = (m ? m[1] : body).trim();
    try {
      const data = JSON.parse(jsonStr) as { mainEntity?: Array<{ name?: string }> };
      const qs = (data.mainEntity ?? []).map((e) => e?.name).filter(Boolean) as string[];
      if (qs.length > 0) return `FAQ · ${qs.slice(0, 3).join(' / ')}`;
    } catch {
      // fall through
    }
  }
  return q.excerpt || body.replace(/<[^>]+>/g, '').slice(0, 180);
}

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
  const [filter, setFilter] = useState<ContentFilter>('all');

  const selfCount = items.filter(isSelfContent).length;
  const partnerCount = items.length - selfCount;

  const filtered = filter === 'all'
    ? items
    : filter === 'self'
      ? items.filter(isSelfContent)
      : items.filter((q) => !isSelfContent(q));

  if (items.length === 0) {
    return (
      <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
        검수 대기 큐가 비어 있습니다. 자동발행 cron 다음 사이클까지 대기.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Round 59 fix 5 — 카테고리 필터 chip */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-soft/40 p-2">
        <span className="text-[11px] font-semibold text-ink-muted">필터:</span>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} color="ink" label="전체" count={items.length} />
        <FilterChip active={filter === 'self'} onClick={() => setFilter('self')} color="brand" label="🏢 자사 인사이트" count={selfCount} />
        <FilterChip active={filter === 'partner'} onClick={() => setFilter('partner')} color="accent" label="🏥 파트너 병원" count={partnerCount} />
      </div>

      {filtered.length === 0 ? (
        <div className="card flex items-center justify-center px-6 py-8 text-sm text-ink-muted">
          "{filter === 'self' ? '자사' : '파트너'}" 카테고리에 검수 대기 글이 없습니다.
        </div>
      ) : (
        filtered.map((q) => {
          const isSelf = isSelfContent(q);
          return (
            <div
              key={String(q.id)}
              className={cn(
                'card relative overflow-hidden transition hover:shadow-md',
                isSelf ? 'border-brand/20' : 'border-accent/20'
              )}
            >
              {/* 좌측 4px stripe — 한눈에 자사/파트너 구분 */}
              <div className={cn('absolute inset-y-0 left-0 w-1', isSelf ? 'bg-brand' : 'bg-accent')} />

              <div className="flex items-start gap-4 border-b border-border px-5 py-3 pl-6">
                <CoverThumb src={q.cover_image_url} alt={q.cover_image_alt || q.title || 'cover'} channel={q.channel} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Round 59 fix 5 — 자사/파트너 분기 chip (가장 prominent) */}
                    {isSelf ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                        🏢 자사 인사이트
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        🏥 파트너 병원
                      </span>
                    )}
                    {/* 병원명 / 클라이언트명 */}
                    <span className="text-[12px] font-semibold text-ink">{q.tenant_name}</span>
                    {/* 파트너만 partner_slug 표시 */}
                    {!isSelf && q.partner_slug && (
                      <span className="font-mono text-[10px] text-ink-muted">@{q.partner_slug}</span>
                    )}
                    <span className="text-[10px] text-ink-faint">|</span>
                    <span className="text-[11px] text-ink-muted">{q.llm_provider || q.channel || '?'}</span>
                    {q.keyword_text && <span className="text-[11px] text-ink-muted">· {q.keyword_text}</span>}
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-ink">{q.title || '(제목 없음)'}</h3>
                  <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                    {cardExcerpt(q)}
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
                  {q.quality && (
                    <div className="mt-1.5 flex justify-end">
                      <QualityBadge quality={q.quality} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3 pl-6">
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
          );
        })
      )}
    </div>
  );
}

/** Round 59 fix 5 — 카테고리 필터 chip */
function FilterChip({
  active, onClick, color, label, count
}: { active: boolean; onClick: () => void; color: 'ink' | 'brand' | 'accent'; label: string; count: number }) {
  const activeCls = color === 'brand'
    ? 'bg-brand text-white border-brand'
    : color === 'accent'
      ? 'bg-accent text-white border-accent'
      : 'bg-ink text-white border-ink';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition',
        active ? activeCls : 'border-border bg-surface-base text-ink-soft hover:bg-surface-subtle'
      )}
    >
      {label}
      <span className={cn(
        'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px]',
        active ? 'bg-white/25 text-white' : 'bg-surface-subtle text-ink-muted'
      )}>{count}</span>
    </button>
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
