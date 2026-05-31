/**
 * Round 34 (2026-05-30) — AI 인용 페이지의 탭 네비게이션.
 *
 * 자사 현황 ↔ 경쟁사 현황 두 페이지 사이 이동.
 * URL 라우팅 — Link 컴포넌트로 페이지 전환.
 */
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Activity, Crosshair } from 'lucide-react';
import { cn } from '@/lib/cn';

const TABS = [
  {
    href: '/admin/citations',
    label: '자사 현황 보기',
    icon: Activity,
    desc: '메디맵 + 클라이언트 자체 AI 인용 분석',
  },
  {
    href: '/admin/competitors',
    label: '경쟁사 현황 보기',
    icon: Crosshair,
    desc: '비즈니스 모델 키워드 기준 동종업계 경쟁사 분석',
  },
];

export function CitationsTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Round 34 phase 5 (2026-05-30): tenantId 를 URL query 로 두 페이지 간 공유.
  // 자사 → 경쟁사 탭 전환 시 선택된 클라이언트 유지.
  const tenantId = searchParams.get('tenantId');
  return (
    <nav className="mb-5 flex gap-1 border-b border-border print:hidden">
      {TABS.map((t) => {
        const isActive = pathname === t.href;
        const Icon = t.icon;
        const href = tenantId ? `${t.href}?tenantId=${tenantId}` : t.href;
        return (
          <Link
            key={t.href}
            href={href}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition',
              isActive
                ? 'text-brand'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{t.label}</span>
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
