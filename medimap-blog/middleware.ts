import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  isAdminConfigured,
  verifySessionCookie,
} from "@/lib/admin-auth";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // /admin/login 자체는 게이트 통과 — 로그인 폼 + 인증 처리.
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  // ADMIN_PASSWORD 미설정이면 안내 페이지로 강제 (잠금된 어드민 보호).
  if (!isAdminConfigured()) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("setup", "1");
    return NextResponse.redirect(url);
  }

  const session = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionCookie(session);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    if (pathname !== "/admin") {
      url.searchParams.set("from", pathname + search);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
