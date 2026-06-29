/**
 * Round 87 (2026-06-28) — 콘텐츠 경쟁력 위젯.
 *
 * 비즈니스 핵심: "메디맵 콘텐츠가 AI 에 자주 인용되도록".
 * 사용자 요구: 인용 잘 되는 콘텐츠 구조 분석 + 카테고리(병원/날짜) 분류 + 자동 적용
 *
 * 현재 (Round 87 P0):
 *   1. Top 인용 콘텐츠 표 (키워드별 mention 카운트 proxy)
 *   2. 병원별 / 카테고리별 필터
 *   3. 패턴 자동 분석 — 인용 많은 글의 공통점 (제목 길이, 카테고리, 발행 요일)
 *   4. 외부 라이브 URL 클릭 이동
 *
 * 다음 (Round 88):
 *   - mention 테이블에 content_id 컬럼 추가 → 정확한 매칭
 *   - 콘텐츠 구조 자동 추출 (H2 패턴 / 표 개수 / 길이)
 *   - 학습 인사이트 자동 적용 (top 콘텐츠 구조 → 다음 prompt)
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Trophy, ExternalLink, Filter, ArrowUpDown, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/cn';

type Content = {
  id: number;
  title: string;
  slug: string;
  tenantName: string;
  tenantId: number;
  publishedAt: string;
  keyword: string;
  mentionsForKeyword: number;
  isPartner: boolean;
  partnerCategory: string | null;
};

const SITE = process.env.NEXT_PUBLIC_PUBLIC_BLOG_URL ?? 'https://wecircle.co.kr';

function buildUrl(c: Content): string {
  if (c.isPartner && c.partnerCategory) {
    // partner_slug 모름 → 그냥 blog 로 fallback (Round 88 에서 fix)
    return `${SITE}/blog/${c.slug}`;
  }
  return `${SITE}/blog/${c.slug}`;
}

export function ContentCompetitiveness({ contents }: { contents: Content[] }) {
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'self' | 'partner'>('all');
  const [daysFilter, setDaysFilter] = useState<7 | 14 | 30>(30);
  const [sortBy, setSortBy] = useState<'mentions' | 'date'>('mentions');
  // Round 104 ② — 기본 상위 8행만 노출(세로 길이 축소). "전체 보기"로 펼침.
  const [showAll, setShowAll] = useState(false);
  const COLLAPSED = 8;

  const tenants = useMemo(
    () => Array.from(new Set(contents.map((c) => c.tenantName))).sort(),
    [contents]
  );

  const filtered = useMemo(() => {
    // Round 94 — 다중 필터: 카테고리(자사/파트너) + 병원 + 기간(7/14/30일) + 정렬
    const now = Date.now();
    const cutoff = now - daysFilter * 24 * 60 * 60 * 1000;
    let arr = contents.filter((c) => {
      // 카테고리 필터
      if (categoryFilter === 'self' && c.isPartner) return false;
      if (categoryFilter === 'partner' && !c.isPartner) return false;
      // 병원 필터
      if (tenantFilter !== 'all' && c.tenantName !== tenantFilter) return false;
      // 기간 필터
      if (c.publishedAt) {
        const t = new Date(c.publishedAt).getTime();
        if (t < cutoff) return false;
      }
      return true;
    });
    if (sortBy === 'mentions') {
      arr = [...arr].sort((a, b) => b.mentionsForKeyword - a.mentionsForKeyword);
    } else {
      arr = [...arr].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    }
    return arr;
  }, [contents, tenantFilter, categoryFilter, daysFilter, sortBy]);

  // 자동 패턴 분석 — 인용 많은 top 10 vs 평균
  const insights = useMemo(() => {
    if (contents.length < 5) return null;
    const sorted = [...contents].sort((a, b) => b.mentionsForKeyword - a.mentionsForKeyword);
    const top10 = sorted.slice(0, 10);
    const rest = sorted.slice(10);
    if (rest.length === 0) return null;

    const avgTopMentions = top10.reduce((s, c) => s + c.mentionsForKeyword, 0) / top10.length;
    const avgRestMentions = rest.reduce((s, c) => s + c.mentionsForKeyword, 0) / rest.length;
    const lift = avgRestMentions > 0 ? ((avgTopMentions - avgRestMentions) / avgRestMentions) * 100 : 0;

    const avgTopTitleLen = top10.reduce((s, c) => s + c.title.length, 0) / top10.length;
    const avgRestTitleLen = rest.reduce((s, c) => s + c.title.length, 0) / rest.length;

    // 카테고리(병원) 별 인용 — top 1 병원 추출
    const tenantCount: Record<string, number> = {};
    top10.forEach((c) => {
      tenantCount[c.tenantName] = (tenantCount[c.tenantName] ?? 0) + c.mentionsForKeyword;
    });
    const topTenant = Object.entries(tenantCount).sort(([, a], [, b]) => b - a)[0];

    return {
      avgTopMentions: Math.round(avgTopMentions),
      avgRestMentions: Math.round(avgRestMentions),
      lift: Math.round(lift),
      avgTopTitleLen: Math.round(avgTopTitleLen),
      avgRestTitleLen: Math.round(avgRestTitleLen),
      topTenant: topTenant ? topTenant[0] : null,
      topTenantMentions: topTenant ? topTenant[1] : 0,
    };
  }, [contents]);

  return (
    <section className="card mt-6">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Trophy className="h-4 w-4 text-brand" />
              메디맵 콘텐츠 경쟁력 — Top 인용 콘텐츠
            </h2>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              30일 발행 글 × 해당 키워드의 AI 인용 mention 수 — 어떤 콘텐츠가 시장에 영향력 있는지
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Round 94 — 카테고리 토글 (자사/파트너/전체) */}
            <div className="flex rounded-md border border-border bg-white p-0.5">
              {([
                { v: 'all', label: '전체' },
                { v: 'self', label: '자사' },
                { v: 'partner', label: '파트너' },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setCategoryFilter(opt.v)}
                  className={cn(
                    'rounded px-2 py-1 text-[11px] font-semibold transition',
                    categoryFilter === opt.v
                      ? 'bg-brand text-white'
                      : 'text-ink-soft hover:bg-surface-subtle'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Round 94 — 기간 토글 */}
            <div className="flex rounded-md border border-border bg-white p-0.5">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysFilter(d)}
                  className={cn(
                    'rounded px-2 py-1 text-[11px] font-semibold transition',
                    daysFilter === d
                      ? 'bg-brand text-white'
                      : 'text-ink-soft hover:bg-surface-subtle'
                  )}
                >
                  {d}일
                </button>
              ))}
            </div>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="rounded-md border border-border bg-white px-2 py-1 text-xs text-ink"
            >
              <option value="all">전체 병원</option>
              {tenants.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'mentions' ? 'date' : 'mentions')}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-xs text-ink-soft hover:bg-surface-subtle"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortBy === 'mentions' ? '인용순' : '날짜순'}
            </button>
          </div>
        </div>
      </header>

      {/* 자동 패턴 분석 */}
      {insights && (
        <div className="border-b border-border bg-brand-50/40 px-4 py-3 text-[11px] text-ink-soft md:px-5">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-700" />
            <div className="flex-1">
              <div className="font-semibold text-brand-700">자동 패턴 분석</div>
              <div className="mt-1">
                Top 10 콘텐츠 평균 인용 <strong>{insights.avgTopMentions}건</strong> vs 나머지 <strong>{insights.avgRestMentions}건</strong>
                {insights.lift > 0 && (
                  <span className="ml-1 font-semibold text-status-success">
                    (Top 이 {insights.lift}% 더 인용)
                  </span>
                )}
                · 평균 제목 길이 <strong>{insights.avgTopTitleLen}자</strong> (나머지 {insights.avgRestTitleLen}자)
                {insights.topTenant && (
                  <span className="ml-1">
                    · 최강 병원: <strong>{insights.topTenant}</strong> ({insights.topTenantMentions}건)
                  </span>
                )}
              </div>
              <div className="mt-1 text-[10px] text-ink-muted">
                💡 활용: Top 콘텐츠 구조(제목 길이/병원/키워드) 를 다음 cron 글 prompt 에 학습 적용 (Round 88 자동화 예정)
              </div>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-muted">
          최근 30일 발행 콘텐츠 없음
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">제목</th>
                <th className="px-3 py-2 text-left">병원</th>
                <th className="px-3 py-2 text-left">키워드</th>
                <th className="px-3 py-2 text-right">인용 (30일)</th>
                <th className="px-3 py-2 text-right">발행일</th>
                <th className="px-3 py-2 text-center">링크</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? filtered.slice(0, 50) : filtered.slice(0, COLLAPSED)).map((c, i) => {
                const isStar = c.mentionsForKeyword >= 10;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-subtle">
                    <td className="px-3 py-2 font-mono text-[10px] text-ink-muted">{i + 1}</td>
                    <td className="px-3 py-2 max-w-[280px] truncate text-sm text-ink" title={c.title}>
                      {isStar && '⭐ '}
                      {c.title}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-soft">{c.tenantName}</td>
                    <td className="px-3 py-2 text-xs text-ink-muted">{c.keyword || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={cn(
                        'inline-flex min-w-[40px] justify-center rounded-md px-2 py-0.5 font-mono text-xs font-bold',
                        c.mentionsForKeyword >= 50 ? 'bg-status-successSoft text-status-success' :
                        c.mentionsForKeyword >= 10 ? 'bg-brand-50 text-brand-700' :
                        c.mentionsForKeyword > 0 ? 'bg-surface-subtle text-ink-soft' :
                        'bg-status-warningSoft text-status-warning'
                      )}>
                        {c.mentionsForKeyword}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-ink-muted">
                      {c.publishedAt ? new Date(c.publishedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link
                        href={buildUrl(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Round 104 ② — 전체 보기/접기 (세로 길이 축소) */}
      {filtered.length > COLLAPSED && (
        <div className="border-t border-border px-4 py-2 text-center md:px-5">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
          >
            {showAll
              ? '접기'
              : `전체 ${filtered.length}개 보기 (+${filtered.length - COLLAPSED})`}
          </button>
        </div>
      )}

      {/* 운영 액션 가이드 */}
      <div className="border-t border-border bg-surface-subtle/50 px-4 py-2 text-[10px] text-ink-muted md:px-5">
        ⭐ = 인용 10+ 인 콘텐츠 · 인용 0인 글 = 키워드 재검토 또는 콘텐츠 추가 발행 검토
        · <Filter className="inline h-2.5 w-2.5" /> 병원 필터로 클라이언트별 성과 확인
      </div>
    </section>
  );
}
