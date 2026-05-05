"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 루트 레이아웃이 모든 라우트에 Header/Footer 를 강제하지 않도록 분기.
 * /admin/* 경로에서는 어드민 자체 chrome (사이드바) 만 노출.
 */
export function PublicChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  return (
    <>
      {!isAdmin && header}
      <main className="flex-1">{children}</main>
      {!isAdmin && footer}
    </>
  );
}
