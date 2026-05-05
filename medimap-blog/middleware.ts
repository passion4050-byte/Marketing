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

  // /admin/login: 미인증이면 로그인 폼, 이미 인증된 상태면 dashboard 로.
  if (pathname.startsWith("/admin/login")) {
    if (isAdminConfigured()) {
      const session = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
      const alreadyAuthed = await verifySessionCookie(session);
      if (alreadyAuthed) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }
    return NextResponse.next();
  }

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
