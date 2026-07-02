"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Tag, User, LogOut, Menu, X, Building2 } from "lucide-react";

const NAV = [
  { href: "/client", label: "대시보드", icon: LayoutDashboard },
  { href: "/client/keywords", label: "키워드 관리", icon: Tag },
  { href: "/client/persona", label: "병원 정보", icon: User },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/client" ? pathname === "/client" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={[
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition",
                active ? "bg-brand/10 text-brand" : "text-ink-muted hover:bg-surface-alt hover:text-ink",
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

function BrandHeader({ onClose, tenantName }: { onClose?: () => void; tenantName?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/70 px-5 py-5">
      <Link href="/client" onClick={onClose} className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/medimap-logo.svg" alt="WECIRCLE" width={134} height={22} className="h-5 w-auto" />
        <div>
          <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-deep">CLIENT</span>
          {tenantName && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-ink-subtle">
              <Building2 size={10} /> {tenantName}
            </div>
          )}
        </div>
      </Link>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="메뉴 닫기"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-alt">
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function LogoutForm() {
  return (
    <form action="/api/client/logout" method="post" className="border-t border-line/70 p-3">
      <button type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-ink-muted transition hover:bg-surface-alt hover:text-ink">
        <LogOut size={16} />
        로그아웃
      </button>
    </form>
  );
}

export function ClientSidebar({ tenantName }: { tenantName?: string }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-white px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="메뉴 열기"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-alt">
          <Menu size={20} />
        </button>
        <Link href="/client" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/medimap-logo.svg" alt="WECIRCLE" width={134} height={22} className="h-4 w-auto" />
          <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent-deep">CLIENT</span>
        </Link>
        <span className="w-10" aria-hidden />
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="백드롭" onClick={() => setOpen(false)}
                  className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-slide-in-left">
            <BrandHeader onClose={() => setOpen(false)} tenantName={tenantName} />
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <LogoutForm />
          </aside>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 border-r border-line/70 bg-white lg:flex lg:flex-col">
        <BrandHeader tenantName={tenantName} />
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavList pathname={pathname} />
        </nav>
        <LogoutForm />
      </aside>
    </>
  );
}
