"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Link2,
  Settings,
  LogOut,
} from "lucide-react";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/inquiries", label: "문의 관리", icon: MessageSquare },
  { href: "/admin/shortlinks", label: "단축링크", icon: Link2 },
  { href: "/admin/settings", label: "환경설정", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line/70 bg-white lg:flex lg:flex-col">
      <Link
        href="/admin"
        className="flex items-center gap-2.5 px-5 py-5 border-b border-line/70"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent text-white text-[15px] font-extrabold">
          M
        </div>
        <div className="text-[15px] font-bold tracking-tight text-ink">
          MEDIMAP
          <span className="ml-1.5 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
            ADMIN
          </span>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
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
      </nav>
      <form action="/api/admin/logout" method="post" className="border-t border-line/70 p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-ink-muted transition hover:bg-surface-alt hover:text-ink"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </form>
    </aside>
  );
}
