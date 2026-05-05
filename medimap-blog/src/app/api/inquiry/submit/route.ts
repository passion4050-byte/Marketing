import { NextResponse } from "next/server";
import {
  isInquiryFormType,
  submitInquiry,
  type InquiryFormType,
} from "@/lib/inquiries";
import { hashIp } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubmitBody {
  form_type?: unknown;
  org_name?: unknown;
  contact_name?: unknown;
  phone?: unknown;
  email?: unknown;
  message?: unknown;
}

const MAX_FIELD_LEN = 2000;
const MAX_MESSAGE_LEN = 4000;

function asStr(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

export async function POST(req: Request) {
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const form_type = isInquiryFormType(body.form_type)
    ? (body.form_type as InquiryFormType)
    : undefined;
  const org_name = asStr(body.org_name, MAX_FIELD_LEN);
  const contact_name = asStr(body.contact_name, MAX_FIELD_LEN);
  const phone = asStr(body.phone, MAX_FIELD_LEN);
  const email = asStr(body.email, MAX_FIELD_LEN);
  const message = asStr(body.message, MAX_MESSAGE_LEN);

  if (!form_type || !org_name || !contact_name || !message) {
    return NextResponse.json(
      { ok: false, error: "missing-fields" },
      { status: 400 },
    );
  }

  // 익명화된 메타데이터 — IP 는 prefix-hash 로만 저장.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ip_hash = (await hashIp(ip)) ?? undefined;
  const user_agent =
    req.headers.get("user-agent")?.slice(0, MAX_FIELD_LEN) ?? undefined;
  const referer =
    req.headers.get("referer")?.slice(0, MAX_FIELD_LEN) ?? undefined;

  const result = await submitInquiry({
    form_type,
    org_name,
    contact_name,
    phone,
    email,
    message,
    ip_hash,
    user_agent,
    referer,
  });

  if (!result.ok) {
    // DB 미설정이면 200 + warning 으로 응답 — UX 깨지 않게 폴백.
    if (result.error === "database-unconfigured") {
      return NextResponse.json(
        { ok: true, warning: "saved-locally-only", id: null },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "insert-failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
