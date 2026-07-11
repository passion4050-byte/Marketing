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
  // /en (해외 영문 버전)은 자체 영문 header/footer(/en/layout.tsx)를 쓰므로 한국어 크롬 숨김.
  const isPortal =
    (pathname?.startsWith("/admin") ||
      pathname?.startsWith("/client") ||
      pathname?.startsWith("/en") ||
      pathname?.startsWith("/ja") ||
      pathname?.startsWith("/zh")) ??
    false;
  return (
    <>
      {!isPortal && header}
      <main className="flex-1">{children}</main>
      {!isPortal && footer}
    </>
  );
}
