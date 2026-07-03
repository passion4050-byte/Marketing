'use client';

/**
 * Round 116 P4 (2026-07-02) — 콘텐츠 완료 탭 chip 필터 + 진료항목 select + 페이지네이션.
 * Round 117-A (2026-07-03) — 페이지 사이즈 드롭다운 + 게재 중단(archive) + 자체 편집 모달.
 *
 * 근본 원인 (함정 ED): 원본 content-queue/page.tsx (1046줄) 에서 Edit tool 이 반복 truncate.
 * 해결 (D+B): PublishedTab 을 이 파일로 분리 + self-contained (types, helpers 재정의).
 * page.tsx 에서는 import 만 추가하고 원본 함수는 삭제.
 *
 * 신기능 (Round 117-A):
 *   1. 페이지 사이즈 드롭다운 (10 / 25 / 50, 기본 25)
 *   2. 게재 중단 (archive, soft delete) — status='archived'. 게재 중단 보기 토글 +
 *      게재 재개 (unarchive). 아카이브 목록은 이 컴포넌트가 직접 fetch (page.tsx 무변경).
 *   3. 자체 편집 모달 — title / excerpt / body PATCH 재사용 (Round 18 API).
 *
 * self-contained: page.tsx 의 QueueItem 은 구조적으로 PublishedTabItem 의 super set 이라
 * TypeScript structural typing 으로 그대로 넘겨받음. archive/edit 후 로컬 상태만 갱신
 * (부모 refetch 불필요 — 새로고침 시 서버 상태와 자연 수렴).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  Pencil,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// 필요한 필드만 정의 (page.tsx QueueItem 의 subset — structural typing 으로 assignable)
export interface PublishedTabItem {
  id: number | string;
  tenant_id: number | null;
  tenant_name: string;
  partner_slug: string | null;
  partner_category: string | null;
  is_partner_content: boolean | null;
  title: string | null;
  keyword_text: string | null;
  published_at: string | null;
  live_url: string | null;
  view_count: number | null;
  citation_count: number | null;
  // Round 117-A — 편집 모달용 (page.tsx QueueItem 에 존재. GET API 도 내려줌)
  body?: string | null;
  excerpt?: string | null;
}

const PARTNER_CATEGORY_KO: Record<string, string> = {
  eyeclinic: '안과',
  derma: '피부과',
  plastic: '성형외과',
  dental: '치과',
  internal: '내과',
  hair: '모발이식',
  oriental: '한방',
};

type ContentFilter = 'all' | 'self' | 'partner';
type ViewMode = 'live' | 'archived';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 25;

function isSelfContent(q: PublishedTabItem): boolean {
  const slug = q.partner_slug ?? '';
  return (
    slug === 'medimap' ||
    slug === 'medimap-self' ||
    (slug === '' && !q.is_partner_content)
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function FilterChip({
  active,
  onClick,
  color,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  color: 'ink' | 'brand' | 'accent' | 'muted';
  label: string;
  count: number | null;
}) {
  const activeCls =
    color === 'brand'
      ? 'bg-brand text-white border-brand'
      : color === 'accent'
      ? 'bg-accent text-white border-accent'
      : color === 'muted'
      ? 'bg-stone-500 text-white border-stone-500'
      : 'bg-ink text-white border-ink';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition',
        active
          ? activeCls
          : 'border-border bg-surface-base text-ink-soft hover:bg-surface-subtle'
      )}
    >
      {label}
      {count != null && (
        <span
          className={cn(
            'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px]',
            active ? 'bg-white/25 text-white' : 'bg-surface-subtle text-ink-muted'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Round 117-A — 자체 편집 모달 (title / excerpt / body → PATCH 재사용) */
/* ------------------------------------------------------------------ */

function EditModal({
  item,
  onClose,
  onSaved,
}: {
  item: PublishedTabItem;
  onClose: () => void;
  onSaved: (patch: { title: string; excerpt: string; body: string }) => void;
}) {
  const [title, setTitle] = useState(item.title ?? '');
  const [excerpt, setExcerpt] = useState(item.excerpt ?? '');
  const [body, setBody] = useState(item.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!title.trim() || !body.trim()) {
      setError('제목과 본문은 비울 수 없습니다.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content-queue/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, excerpt, body }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? `저장 실패 (HTTP ${res.status})`);
        return;
      }
      onSaved({ title, excerpt, body });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setSaving(false);
    }
  }, [title, excerpt, body, item.id, onSaved, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200/70 px-5 py-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
              콘텐츠 편집
            </div>
            <div className="text-xs text-stone-400">
              #{String(item.id)} · {item.tenant_name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
              제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
              placeholder="제목"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
              요약 (excerpt)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-900 focus:border-stone-900 focus:outline-none"
              placeholder="목록/메타에 노출되는 요약 (비우면 null 저장)"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
              본문 (HTML)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full resize-y rounded-md border border-stone-200 bg-stone-50/50 px-3 py-2 font-mono text-xs leading-relaxed text-stone-900 focus:border-stone-900 focus:outline-none"
              placeholder="<p>본문 HTML</p>"
            />
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-200/70 bg-stone-50/40 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PublishedTab 본체                                                    */
/* ------------------------------------------------------------------ */

export function PublishedTab({ items }: { items: PublishedTabItem[] }) {
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Round 117-A — 로컬 rows (archive/edit 후 부모 refetch 없이 즉시 반영)
  const [rows, setRows] = useState<PublishedTabItem[]>(items);
  useEffect(() => {
    setRows(items);
  }, [items]);

  // Round 117-A — 게재 중단 보기 (archived 목록은 자체 fetch — page.tsx 무변경)
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [archivedRows, setArchivedRows] = useState<PublishedTabItem[] | null>(null);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState<string | null>(null);

  // 행 액션 상태
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublishedTabItem | null>(null);

  const fetchArchived = useCallback(async () => {
    setArchivedLoading(true);
    setArchivedError(null);
    try {
      const res = await fetch('/api/admin/content-queue?status=archived', {
        cache: 'no-store',
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; items?: PublishedTabItem[]; error?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setArchivedError(json?.error ?? `불러오기 실패 (HTTP ${res.status})`);
        return;
      }
      setArchivedRows(json.items ?? []);
    } catch (e) {
      setArchivedError(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'archived' && archivedRows === null && !archivedLoading) {
      void fetchArchived();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const archiveOne = useCallback(
    async (q: PublishedTabItem) => {
      if (
        !confirm(
          `"${q.title || '(제목 없음)'}" 게재를 중단할까요?\n라이브 페이지에서 내려가며, 게재 중단 보기에서 언제든 재개할 수 있습니다.`
        )
      )
        return;
      setBusyId(String(q.id));
      try {
        const res = await fetch(
          `/api/admin/content-queue/${q.id}?action=archive`,
          { method: 'POST' }
        );
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;
        if (!res.ok || !json?.ok) {
          alert(json?.error ?? `게재 중단 실패 (HTTP ${res.status})`);
          return;
        }
        setRows((arr) => arr.filter((it) => String(it.id) !== String(q.id)));
        setArchivedRows((arr) => (arr ? [q, ...arr] : arr));
      } catch (e) {
        alert(e instanceof Error ? e.message : '네트워크 오류');
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const unarchiveOne = useCallback(
    async (q: PublishedTabItem) => {
      setBusyId(String(q.id));
      try {
        const res = await fetch(
          `/api/admin/content-queue/${q.id}?action=unarchive`,
          { method: 'POST' }
        );
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;
        if (!res.ok || !json?.ok) {
          alert(json?.error ?? `게재 재개 실패 (HTTP ${res.status})`);
          return;
        }
        setArchivedRows((arr) =>
          arr ? arr.filter((it) => String(it.id) !== String(q.id)) : arr
        );
        setRows((arr) => [q, ...arr]);
      } catch (e) {
        alert(e instanceof Error ? e.message : '네트워크 오류');
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const onEditSaved = useCallback(
    (id: number | string, patch: { title: string; excerpt: string; body: string }) => {
      const apply = (arr: PublishedTabItem[]) =>
        arr.map((it) =>
          String(it.id) === String(id)
            ? { ...it, title: patch.title, excerpt: patch.excerpt || null, body: patch.body }
            : it
        );
      setRows(apply);
      setArchivedRows((arr) => (arr ? apply(arr) : arr));
    },
    []
  );

  const selfCount = useMemo(() => rows.filter(isSelfContent).length, [rows]);
  const partnerCount = rows.length - selfCount;

  // 진료항목별 카운트 (select 라벨용)
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of rows) {
      const key = isSelfContent(q) ? 'self' : q.partner_category ?? 'unknown';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  // 필터 적용 (archived 모드에선 archive 목록에 동일 필터 적용)
  const baseRows: PublishedTabItem[] =
    viewMode === 'archived' ? archivedRows ?? [] : rows;

  const filtered = useMemo(() => {
    let arr = baseRows;
    if (filter === 'self') arr = arr.filter(isSelfContent);
    else if (filter === 'partner') arr = arr.filter((q) => !isSelfContent(q));
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'self') arr = arr.filter(isSelfContent);
      else
        arr = arr.filter(
          (q) => !isSelfContent(q) && q.partner_category === categoryFilter
        );
    }
    return arr;
  }, [baseRows, filter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 필터/페이지사이즈/뷰 변경 시 페이지 1로 reset
  useEffect(() => {
    setPage(1);
  }, [filter, categoryFilter, pageSize, viewMode]);

  if (rows.length === 0 && viewMode === 'live' && (archivedRows?.length ?? 0) === 0) {
    return (
      <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
        아직 발행 완료된 콘텐츠가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter 헤더 — chip + select + 페이지 사이즈 + 결과 카운트 */}
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            color="ink"
            label="전체"
            count={baseRows.length}
          />
          <FilterChip
            active={filter === 'self'}
            onClick={() => setFilter('self')}
            color="brand"
            label="🏢 자사 인사이트"
            count={viewMode === 'live' ? selfCount : null}
          />
          <FilterChip
            active={filter === 'partner'}
            onClick={() => setFilter('partner')}
            color="accent"
            label="🏥 파트너 병원"
            count={viewMode === 'live' ? partnerCount : null}
          />
          {/* Round 117-A — 게재 중단 보기 토글 */}
          <span className="mx-0.5 h-4 w-px bg-stone-200" aria-hidden />
          <FilterChip
            active={viewMode === 'archived'}
            onClick={() =>
              setViewMode((m) => (m === 'archived' ? 'live' : 'archived'))
            }
            color="muted"
            label="🗄 게재 중단"
            count={archivedRows ? archivedRows.length : null}
          />
        </div>
        <div className="flex items-center gap-1.5 border-l border-stone-200/70 pl-3">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
            진료항목
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-800 focus:border-stone-900 focus:outline-none"
          >
            <option value="all">전체 ({baseRows.length})</option>
            <option value="self">
              자사 인사이트 ({categoryCounts.get('self') ?? 0})
            </option>
            {Object.entries(PARTNER_CATEGORY_KO).map(([slug, ko]) => (
              <option key={slug} value={slug}>
                {ko} ({categoryCounts.get(slug) ?? 0})
              </option>
            ))}
          </select>
        </div>
        {/* Round 117-A — 페이지 사이즈 드롭다운 */}
        <div className="flex items-center gap-1.5 border-l border-stone-200/70 pl-3">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
            표시
          </label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-800 focus:border-stone-900 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}편
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-[11px] font-semibold text-stone-500">
          결과{' '}
          <span className="font-black text-stone-950">
            {filtered.length.toLocaleString()}
          </span>
          편 · 페이지 {currentPage}/{totalPages}
        </div>
      </div>

      {/* archived 로딩/에러 상태 */}
      {viewMode === 'archived' && archivedLoading ? (
        <div className="card flex items-center justify-center gap-2 px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> 게재 중단 목록 불러오는 중…
        </div>
      ) : viewMode === 'archived' && archivedError ? (
        <div className="card px-6 py-12 text-center text-sm">
          <p className="font-semibold text-red-700">{archivedError}</p>
          <button
            type="button"
            onClick={() => void fetchArchived()}
            className="mt-3 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            다시 시도
          </button>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-stone-500">
          {viewMode === 'archived'
            ? '게재 중단된 콘텐츠가 없습니다.'
            : '이 조건에 해당하는 발행 완료 콘텐츠가 없습니다.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left">진료항목</th>
                  <th className="px-4 py-3 text-left">클라이언트</th>
                  <th className="px-4 py-3 text-left">제목</th>
                  <th className="px-4 py-3 text-left">발행일</th>
                  <th className="px-4 py-3 text-right">조회수</th>
                  <th className="px-4 py-3 text-right">AI 인용</th>
                  <th className="px-4 py-3 text-right">라이브</th>
                  <th className="px-4 py-3 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((q) => {
                  const isSelf = isSelfContent(q);
                  const busy = busyId === String(q.id);
                  const ko = isSelf
                    ? '자사 인사이트'
                    : q.partner_category
                    ? PARTNER_CATEGORY_KO[q.partner_category] ??
                      q.partner_category
                    : '—';
                  return (
                    <tr
                      key={String(q.id)}
                      className="border-t border-border hover:bg-surface-subtle"
                    >
                      <td className="px-4 py-3 text-xs font-semibold text-stone-700">
                        {ko}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-ink">
                          {q.tenant_name}
                        </div>
                        {isSelf ? (
                          <div className="text-[10px] font-mono font-semibold text-emerald-700">
                            자사
                          </div>
                        ) : q.partner_slug ? (
                          <div className="text-[10px] font-mono text-ink-muted">
                            {q.partner_slug}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="line-clamp-1 text-sm text-ink">
                          {q.title || '(제목 없음)'}
                        </div>
                        {q.keyword_text && (
                          <div className="line-clamp-1 text-[11px] text-ink-muted">
                            {q.keyword_text}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {fmtDate(q.published_at)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono">
                        {q.view_count == null ? (
                          <span
                            className="inline-flex items-center gap-1 text-ink-muted"
                            title="페이지뷰 파이프라인 미연결"
                          >
                            <Eye className="h-3 w-3" /> —
                          </span>
                        ) : (
                          q.view_count.toLocaleString()
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono">
                        {q.citation_count == null ? (
                          <span
                            className="inline-flex items-center gap-1 text-ink-muted"
                            title="AI 인용 추적 미연결"
                          >
                            <MessageSquare className="h-3 w-3" /> —
                          </span>
                        ) : (
                          <span
                            className={
                              q.citation_count > 0
                                ? 'font-bold text-emerald-700'
                                : 'text-ink-muted'
                            }
                          >
                            {q.citation_count.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {viewMode === 'live' && q.live_url ? (
                          <Link
                            href={q.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-stone-700 hover:text-stone-950 hover:underline"
                          >
                            열기 <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditing(q)}
                            title="편집 (제목/요약/본문)"
                            className="rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {viewMode === 'live' ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void archiveOne(q)}
                              title="게재 중단 (soft delete — 언제든 재개 가능)"
                              className="rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void unarchiveOne(q)}
                              title="게재 재개 (published 로 복귀)"
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              )}
                              재개
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between gap-3 border-t border-stone-200/70 bg-stone-50/40 px-4 py-2.5 text-[11px]">
            <span className="text-stone-500">
              {((currentPage - 1) * pageSize + 1).toLocaleString()}
              {' – '}
              {Math.min(currentPage * pageSize, filtered.length).toLocaleString()}
              {' of '}
              <span className="font-bold text-stone-800">
                {filtered.length.toLocaleString()}
              </span>
              {' 편'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft className="h-3 w-3" /> 이전
              </button>
              <span className="px-2 text-xs font-bold text-stone-800 tabular-nums">
                {currentPage}{' '}
                <span className="text-stone-400">/</span> {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
              >
                다음 <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="border-t border-stone-200/70 bg-surface-subtle px-4 py-2.5 text-[11px] text-ink-muted">
            조회수 / AI 인용 컬럼은 데이터 파이프라인 연결 후 자동 표시 (GA4 +
            /admin/citations 통합 예정)
          </div>
        </div>
      )}

      {/* Round 117-A — 자체 편집 모달 */}
      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(patch) => onEditSaved(editing.id, patch)}
        />
      )}
    </div>
  );
}
