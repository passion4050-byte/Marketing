'use client';

/**
 * Round 116 P4 (2026-07-02) — 콘텐츠 완료 탭 chip 필터 + 진료항목 select + 페이지네이션.
 *
 * 근본 원인 (함정 ED): 원본 content-queue/page.tsx (1046줄) 에서 Edit tool 이 반복 truncate.
 * 해결 (D+B): PublishedTab 을 이 파일로 분리 + self-contained (types, helpers 재정의).
 * page.tsx 에서는 import 만 추가하고 원본 함수는 삭제.
 *
 * 신기능:
 *   1. 카테고리 chip (전체 / 자사 / 파트너)
 *   2. 진료항목 select (전체 / 자사 / 안과 / 피부과 / ...) — 카운트 표시
 *   3. 페이지네이션 (50편/page)
 *   4. Editorial 톤 (stone/emerald — Round 116 P2 와 정합)
 *
 * self-contained: page.tsx 의 QueueItem 은 구조적으로 PublishedTabItem 의 super set 이라
 * TypeScript structural typing 으로 그대로 넘겨받음.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  MessageSquare,
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
  color: 'ink' | 'brand' | 'accent';
  label: string;
  count: number;
}) {
  const activeCls =
    color === 'brand'
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
        active
          ? activeCls
          : 'border-border bg-surface-base text-ink-soft hover:bg-surface-subtle'
      )}
    >
      {label}
      <span
        className={cn(
          'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px]',
          active ? 'bg-white/25 text-white' : 'bg-surface-subtle text-ink-muted'
        )}
      >
        {count}
      </span>
    </button>
  );
}

const PUBLISHED_PAGE_SIZE = 50;

export function PublishedTab({ items }: { items: PublishedTabItem[] }) {
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const selfCount = useMemo(
    () => items.filter(isSelfContent).length,
    [items]
  );
  const partnerCount = items.length - selfCount;

  // 진료항목별 카운트 (select 라벨용)
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of items) {
      const key = isSelfContent(q) ? 'self' : q.partner_category ?? 'unknown';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [items]);

  // 필터 적용
  const filtered = useMemo(() => {
    let arr = items;
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
  }, [items, filter, categoryFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PUBLISHED_PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PUBLISHED_PAGE_SIZE,
    currentPage * PUBLISHED_PAGE_SIZE
  );

  // 필터 변경 시 페이지 1로 reset
  useEffect(() => {
    setPage(1);
  }, [filter, categoryFilter]);

  if (items.length === 0) {
    return (
      <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
        아직 발행 완료된 콘텐츠가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter 헤더 — chip + select + 결과 카운트 */}
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            color="ink"
            label="전체"
            count={items.length}
          />
          <FilterChip
            active={filter === 'self'}
            onClick={() => setFilter('self')}
            color="brand"
            label="🏢 자사 인사이트"
            count={selfCount}
          />
          <FilterChip
            active={filter === 'partner'}
            onClick={() => setFilter('partner')}
            color="accent"
            label="🏥 파트너 병원"
            count={partnerCount}
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
            <option value="all">전체 ({items.length})</option>
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
        <div className="ml-auto text-[11px] font-semibold text-stone-500">
          결과{' '}
          <span className="font-black text-stone-950">
            {filtered.length.toLocaleString()}
          </span>
          편 · 페이지 {currentPage}/{totalPages}
        </div>
      </div>

      {/* 결과 표 or 빈 상태 */}
      {pageItems.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-stone-500">
          이 조건에 해당하는 발행 완료 콘텐츠가 없습니다.
        </div>
      ) : (
        <div className="card overflow-hidden">
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
                {pageItems.map((q) => {
                  const isSelf = isSelfContent(q);
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
                        {q.live_url ? (
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between gap-3 border-t border-stone-200/70 bg-stone-50/40 px-4 py-2.5 text-[11px]">
            <span className="text-stone-500">
              {((currentPage - 1) * PUBLISHED_PAGE_SIZE + 1).toLocaleString()}
              {' – '}
              {Math.min(
                currentPage * PUBLISHED_PAGE_SIZE,
                filtered.length
              ).toLocaleString()}
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
    </div>
  );
}
