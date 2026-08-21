"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 루트 레이아웃이 모든 라우트에 Header/Footer 를 강제하지 않도록 분기.
 * /admin/* 경로에서는 어드민 자체 chrome (사이드바) 만 노출.
 */
/** 자체 셸(헤더·푸터)을 가진 경로 — 한국어 크롬을 렌더하지 않는다. 언어 추가 시 여기에 등록. */
const PORTAL_PREFIXES = ["/admin", "/client", "/en", "/ja", "/zh", "/tw"] as const;

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
  // 🔴 Round 169 — `/tw` 누락 버그. tw/layout.tsx 도 OverseasShell(자체 헤더+푸터)을 쓰는데
  //   여기 목록에 없어서 대만 경로만 한국어 Header/Footer 안에 중문 셸이 이중 렌더됐다.
  //   상수화해서 언어 추가 시 재발 방지.
  const isPortal = PORTAL_PREFIXES.some((prefix) => pathname?.startsWith(prefix)) ?? false;
  return (
    <>
      {!isPortal && header}
      <main className="flex-1">{children}</main>
      {!isPortal && footer}
    </>
  );
}
