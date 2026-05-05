import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  expectedSessionToken,
  isAdminConfigured,
  verifyPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  password?: unknown;
}

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "setup" }, { status: 503 });
  }

  let password: string | undefined;
  try {
    const body = (await req.json()) as LoginBody;
    if (typeof body.password === "string" && body.password.length > 0) {
      password = body.password;
    }
  } catch {
    // fall through
  }

  if (!password) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });
  }

  const ok = await verifyPassword(password);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  const token = await expectedSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "setup" }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
