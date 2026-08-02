/**
 * Round 144 (2026-08-02) — 대시보드 섹션 접기.
 *
 * 문제 (E2E 감사): 운영 대시보드 한 화면에 위젯 15개+, 스크롤 5~6화면.
 *   매일 보는 운영자는 "오늘 뭘 해야 하나"만 필요한데, 주간 판단용 분석 섹션이
 *   항상 펼쳐져 있어 매번 지나쳐야 했음.
 *
 * 해결: 섹션 단위 접기 + 선택 유지(localStorage).
 *   · 01 지금 봐야 할 것 — 항상 펼침(액션이 있는 곳)
 *   · 02 성과 분석 / 03 운영 로그 — 접을 수 있음
 * 서버 컴포넌트(page.tsx) 안에서 쓰기 위한 client wrapper.
 */
'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export function DashboardSection({
  no,
  title,
  desc,
  storageKey,
  defaultCollapsed = false,
  children,
}: {
  no: string;
  title: string;
  desc?: string;
  storageKey: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`admin-dash-${storageKey}`);
      setCollapsed(v === null ? defaultCollapsed : v === '1');
    } catch {
      setCollapsed(defaultCollapsed);
    }
  }, [storageKey, defaultCollapsed]);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`admin-dash-${storageKey}`, next ? '1' : '0');
      } catch {
        /* private mode — 무시 */
      }
      return next;
    });
  };

  // 첫 페인트에서 깜빡임 방지 — 상태 확정 전엔 기본값으로 그린다.
  const isCollapsed = collapsed ?? defaultCollapsed;

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-baseline gap-3 border-b border-border pb-3 text-left transition hover:border-ink/30"
      >
        <span className="font-mono text-[11px] font-black tracking-widest text-iris">{no}</span>
        <h2 className="text-[15px] font-black tracking-tight text-ink">{title}</h2>
        {desc && <span className="hidden text-[11px] text-ink-muted sm:inline">{desc}</span>}
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 self-center text-ink-muted transition-transform',
            isCollapsed && '-rotate-90',
          )}
        />
      </button>
      {!isCollapsed && children}
    </div>
  );
}
