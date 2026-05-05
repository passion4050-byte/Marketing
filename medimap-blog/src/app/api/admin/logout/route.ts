import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL("/admin/login", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}
