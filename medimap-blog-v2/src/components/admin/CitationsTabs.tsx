/**
 * Round 34 (2026-05-30) — AI 인용 페이지의 탭 네비게이션.
 *
 * 자사 현황 ↔ 경쟁사 현황 두 페이지 사이 이동.
 * URL 라우팅 — Link 컴포넌트로 페이지 전환.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    desc: '비즈니스 모델 키워드 기준 경쟁 안과 분석',
  },
];

export function CitationsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex gap-1 border-b border-border print:hidden">
      {TABS.map((t) => {
        const isActive = pathname === t.href;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
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
