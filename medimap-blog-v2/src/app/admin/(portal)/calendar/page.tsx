'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Loader2, X } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

interface CalItem {
  id: number;
  date: string;       // YYYY-MM-DD
  title: string | null;
  slug: string | null;
  keyword_text: string | null;
  excerpt: string | null;
  body: string;
  status: string;
  compliance_status: string | null;
  is_partner_content: boolean | null;
  partner_category: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tenant_id: number;
  tenant_name: string;
  partner_slug: string | null;
  live_url: string | null;
}

const PARTNER_CATEGORY_KO: Record<string, string> = {
  eyeclinic: '안과', derma: '피부과', plastic: '성형외과',
  dental: '치과', internal: '내과', hair: '모발이식'
};

function startOfMonthGrid(year: number, month0: number): Date {
  // Sunday-start
  const first = new Date(year, month0, 1);
  const dow = first.getDay();
  return new Date(year, month0, 1 - dow);
}
function isSameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function ContentCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [items, setItems] = useState<CalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [preview, setPreview] = useState<CalItem | null>(null);

  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/calendar?year=${year}&month=${month0 + 1}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setItems(data.items ?? []);
    } catch (e) {
      showToast(`캘린더 로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setLoading(false); }
  }, [year, month0]);

  useEffect(() => { void load(); }, [load]);

  // 날짜 → 콘텐츠 매핑
  const byDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) {
      const arr = map.get(it.date) ?? [];
      arr.push(it);
      map.set(it.date, arr);
    }
    return map;
  }, [items]);

  // 6주 × 7일 grid (사용 셀은 5~6주)
  const gridStart = useMemo(() => startOfMonthGrid(year, month0), [year, month0]);
  const cells: Date[] = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      out.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }
    return out;
  }, [gridStart]);

  const todayItems = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  const goPrev = () => setCursor(new Date(year, month0 - 1, 1));
  const goNext = () => setCursor(new Date(year, month0 + 1, 1));
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(ymd(today));
  };

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">콘텐츠 캘린더</h1>
          <p className="admin-page-desc">월별 콘텐츠 발행 · 검수 일정을 한눈에 확인합니다. 날짜 클릭 시 해당 일 콘텐츠 보기</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="rounded-md border border-border p-1.5 hover:bg-surface-subtle"><ChevronLeft className="h-4 w-4" /></button>
          <div className="min-w-[120px] text-center text-sm font-semibold text-ink">
            {year}년 {month0 + 1}월
          </div>
          <button onClick={goNext} className="rounded-md border border-border p-1.5 hover:bg-surface-subtle"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={goToday} className="btn-secondary text-xs">오늘</button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Calendar grid */}
        <div className="card overflow-hidden">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-border bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={cn('px-2 py-2 text-center',
                i === 0 && 'text-status-danger',
                i === 6 && 'text-ink'
              )}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((d, idx) => {
              const inMonth = d.getMonth() === month0;
              const isToday = isSameYMD(d, today);
              const key = ymd(d);
              const dayItems = byDate.get(key) ?? [];
              const isSelected = selectedDate === key;
              const publishedCount = dayItems.filter((x) => x.status === 'published').length;
              const pendingCount = dayItems.filter((x) => x.status === 'pending').length;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    'group relative flex min-h-[88px] flex-col gap-1 border-b border-r border-border p-2 text-left transition',
                    !inMonth && 'bg-surface-subtle/50 text-ink-faint',
                    inMonth && 'hover:bg-surface-subtle',
                    isSelected && 'bg-ink/5 ring-2 ring-inset ring-ink/30'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-between text-xs font-semibold',
                    isToday && 'text-ink-soft'
                  )}>
                    <span className={cn(
                      isToday && 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white'
                    )}>
                      {d.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-mono text-ink-muted">{dayItems.length}</span>
                    )}
                  </div>
                  {/* dot/chip 표시 */}
                  <div className="mt-auto flex flex-wrap gap-0.5">
                    {publishedCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-status-successSoft px-1.5 text-[9px] font-bold text-status-success">
                        ✓{publishedCount}
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-status-warningSoft px-1.5 text-[9px] font-bold text-status-warning">
                        검수{pendingCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {loading && (
            <div className="border-t border-border bg-surface-subtle px-4 py-2 text-center text-[11px] text-ink-muted">
              <Loader2 className="inline h-3 w-3 animate-spin" /> 로드 중…
            </div>
          )}
          {!loading && (
            <div className="border-t border-border bg-surface-subtle px-4 py-2 text-[11px] text-ink-muted">
              {month0 + 1}월 총 {items.length} 건 · 발행 {items.filter((x) => x.status === 'published').length} · 검수 {items.filter((x) => x.status === 'pending').length}
            </div>
          )}
        </div>

        {/* Side panel — 선택 날짜 상세 */}
        <aside className="card max-h-[640px] overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-border bg-surface-base/95 px-5 py-3 backdrop-blur">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">선택 날짜</div>
            <div className="mt-0.5 text-base font-bold text-ink">
              {selectedDate ?? '날짜를 클릭하세요'}
            </div>
            {selectedDate && (
              <div className="mt-1 text-[11px] text-ink-muted">{todayItems.length} 건</div>
            )}
          </div>
          <div className="space-y-2 px-3 py-3">
            {!selectedDate && (
              <div className="px-2 py-8 text-center text-xs text-ink-muted">
                좌측 캘린더에서 날짜를 선택하면 해당일 콘텐츠 리스트가 표시됩니다.
              </div>
            )}
            {selectedDate && todayItems.length === 0 && (
              <div className="px-2 py-8 text-center text-xs text-ink-muted">
                이 날짜에 등록된 콘텐츠가 없습니다.
              </div>
            )}
            {todayItems.map((it) => (
              <button
                key={it.id}
                onClick={() => setPreview(it)}
                className="block w-full rounded-lg border border-border bg-surface-base p-3 text-left transition hover:border-border-strong hover:shadow-card"
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                    it.status === 'published' ? 'bg-status-successSoft text-status-success' : 'bg-status-warningSoft text-status-warning'
                  )}>
                    {it.status === 'published' ? '발행' : '검수'}
                  </span>
                  {it.partner_category && (
                    <span className="text-[10px] font-semibold text-ink">
                      {PARTNER_CATEGORY_KO[it.partner_category] ?? it.partner_category}
                    </span>
                  )}
                  <span className="text-[10px] text-ink-muted">· {it.tenant_name}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-xs font-bold text-ink">{it.title || '(제목 없음)'}</div>
                {it.excerpt && <div className="mt-1 line-clamp-2 text-[11px] text-ink-soft">{it.excerpt}</div>}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* Body modal */}
      {preview && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={() => setPreview(null)}>
          <div className="card w-full max-w-3xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Round 54 (2026-05-31) — modal header 에 라이브 보기 prominent 버튼 */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface-base px-6 py-4">
              <h3 className="min-w-0 truncate text-base font-bold text-ink">{preview.title || '(제목 없음)'}</h3>
              <div className="flex shrink-0 items-center gap-2">
                {preview.live_url ? (
                  <Link
                    href={preview.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ink/85"
                    title={preview.live_url}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> 발행된 콘텐츠 보기
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-soft px-3 py-1.5 text-xs font-semibold text-ink-muted"
                    title={preview.status === 'published' ? 'slug 미생성' : '아직 발행 전'}
                  >
                    URL 미생성
                  </span>
                )}
                <button onClick={() => setPreview(null)} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {preview.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.cover_image_url} alt={preview.cover_image_alt || preview.title || 'cover'}
                className="h-auto w-full border-b border-border bg-surface-subtle object-cover" />
            )}
            <div className="px-6 py-5 text-sm leading-relaxed text-ink-soft">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <span>
                  {preview.tenant_name}
                  {preview.partner_slug ? ` · 파트너:${preview.partner_slug}` : ''}
                  {preview.partner_category ? ` · ${PARTNER_CATEGORY_KO[preview.partner_category] ?? preview.partner_category}` : ''}
                  {' · '}{preview.date}
                </span>
              </div>
              {preview.body?.includes('<') ? (
                <article className="db-html-content max-w-none text-[15px] leading-[1.85]"
                  dangerouslySetInnerHTML={{ __html: preview.body }} />
              ) : (
                <p className="whitespace-pre-wrap">{preview.body}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
