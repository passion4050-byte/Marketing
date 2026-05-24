import { NextResponse } from "next/server";
import {
  CLIENT_COOKIE_MAX_AGE,
  CLIENT_COOKIE_NAME,
  expectedClientToken,
  isClientConfigured,
  verifyClientPassword,
} from "@/lib/client-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isClientConfigured()) {
    return NextResponse.json({ ok: false, error: "setup" }, { status: 503 });
  }
  let password: string | undefined;
  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body.password === "string" && body.password.length > 0) password = body.password;
  } catch {}
  if (!password) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const ok = await verifyClientPassword(password);
  if (!ok) return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });

  const token = await expectedClientToken();
  if (!token) return NextResponse.json({ ok: false, error: "setup" }, { status: 503 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: CLIENT_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CLIENT_COOKIE_MAX_AGE,
  });
  return res;
}
