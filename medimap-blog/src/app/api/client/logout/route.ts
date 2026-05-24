import { NextResponse } from "next/server";
import { CLIENT_COOKIE_NAME } from "@/lib/client-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.redirect(new URL("/client/login", "http://x"), { status: 303 });
  res.cookies.set({ name: CLIENT_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
  return res;
}
