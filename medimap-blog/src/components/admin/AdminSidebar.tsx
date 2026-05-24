"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Link2,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  X,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw,
} from "lucide-react";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  // 콘텐츠 & 발행 (blogkey-adm 흡수)
  { href: "/admin/publications", label: "발행 관리", icon: FileText },
  { href: "/admin/funnel", label: "Funnel · ROI", icon: TrendingUp },
  { href: "/admin/cost", label: "LLM 비용", icon: DollarSign },
  // 데이터 운영
  { href: "/admin/tenants", label: "테넌트", icon: Users },
  { href: "/admin/sync", label: "블로그 동기화", icon: RefreshCw },
  // 기존
  { href: "/admin/inquiries", label: "문의 관리", icon: MessageSquare },
  { href: "/admin/shortlinks", label: "단축링크", icon: Link2 },
  { href: "/admin/settings", label: "환경설정", icon: Settings },
  { href: "/admin/guide", label: "운영 가이드", icon: BookOpen },
];

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={[
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-ink-muted hover:bg-surface-alt hover:text-ink",
              ].join(" ")}
            >
              <Icon size={16} className={active ? "text-brand" : ""} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BrandHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-line/70 px-5 py-5">
      <Link href="/admin" onClick={onClose} className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/medimap-logo.svg" alt="MEDIMAP" width={134} height={22} className="h-5 w-auto" />
        <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
          ADMIN
        </span>
      </Link>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-alt"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function LogoutForm() {
  return (
    <form
      action="/api/admin/logout"
      method="post"
      className="border-t border-line/70 p-3"
    >
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-ink-muted transition hover:bg-surface-alt hover:text-ink"
      >
        <LogOut size={16} />
        로그아웃
      </button>
    </form>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  // 라우트 이동 시 모바일 메뉴 자동 닫기 + 본문 스크롤 잠금.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* 모바일 헤더 — 햄버거 + MEDIMAP 마크. lg 부터 hidden. */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-alt"
        >
          <Menu size={20} />
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/medimap-logo.svg" alt="MEDIMAP" width={134} height={22} className="h-4 w-auto" />
          <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold text-brand">ADMIN</span>
        </Link>
        <span className="w-10" aria-hidden />
      </div>

      {/* 모바일 드로어 — 백드롭 + 패널. */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="메뉴 백드롭"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-slide-in-left">
            <BrandHeader onClose={() => setOpen(false)} />
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <LogoutForm />
          </aside>
        </div>
      )}

      {/* 데스크탑 사이드바 — lg 이상. */}
      <aside className="hidden w-60 shrink-0 border-r border-line/70 bg-white lg:flex lg:flex-col">
        <BrandHeader />
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavList pathname={pathname} />
        </nav>
        <LogoutForm />
      </aside>
    </>
  );
}
