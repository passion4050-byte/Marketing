'use client';

/**
 * 어드민 긴 리스트/표 공통 뷰 — 검색 필터 + 페이지네이션 + 페이지당 개수.
 * 사용:
 *   const lv = useListView(items, { size: 20, search: (it, q) => it.name.toLowerCase().includes(q) });
 *   {lv.searchable && <SearchBox lv={lv} placeholder="도메인 검색" />}
 *   {lv.view.map(...)}
 *   <PageBar lv={lv} />
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface ListView<T> {
  view: T[];
  query: string;
  setQuery: (v: string) => void;
  page: number;
  setPage: (n: number) => void;
  size: number;
  setSize: (n: number) => void;
  pages: number;
  total: number;
  start: number;
  end: number;
  searchable: boolean;
}

export function useListView<T>(
  items: T[],
  opts?: { size?: number; search?: (item: T, q: string) => boolean }
): ListView<T> {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(opts?.size ?? 20);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !opts?.search) return items;
    return items.filter((it) => opts.search!(it, q));
  }, [items, query, opts]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const cur = Math.min(Math.max(1, page), pages);
  const start = (cur - 1) * size;
  const view = filtered.slice(start, start + size);

  return {
    view,
    query,
    setQuery: (v: string) => {
      setQuery(v);
      setPage(1);
    },
    page: cur,
    setPage,
    size,
    setSize: (n: number) => {
      setSize(n);
      setPage(1);
    },
    pages,
    total,
    start,
    end: Math.min(start + size, total),
    searchable: !!opts?.search
  };
}

export function SearchBox<T>({
  lv,
  placeholder = '검색'
}: {
  lv: ListView<T>;
  placeholder?: string;
}) {
  return (
    <div className="relative mb-3 max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <input
        value={lv.query}
        onChange={(e) => lv.setQuery(e.target.value)}
        placeholder={placeholder}
        className="input-base h-9 w-full pl-9 text-sm"
      />
    </div>
  );
}

const SIZES = [10, 20, 50, 100];

export function PageBar<T>({ lv, sizes = SIZES }: { lv: ListView<T>; sizes?: number[] }) {
  if (lv.total === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <div>
        {lv.total}개 중 <b className="tabular-nums text-ink">{lv.start + 1}–{lv.end}</b>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={lv.size}
          onChange={(e) => lv.setSize(Number(e.target.value))}
          className="h-8 rounded-lg border border-border bg-surface-base px-2 text-xs text-ink-soft"
          aria-label="페이지당 개수"
        >
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}개씩
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={lv.page <= 1}
          onClick={() => lv.setPage(lv.page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-base text-ink-soft transition hover:bg-surface-muted disabled:opacity-40"
          aria-label="이전"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums">
          {lv.page} / {lv.pages}
        </span>
        <button
          type="button"
          disabled={lv.page >= lv.pages}
          onClick={() => lv.setPage(lv.page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-base text-ink-soft transition hover:bg-surface-muted disabled:opacity-40"
          aria-label="다음"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
