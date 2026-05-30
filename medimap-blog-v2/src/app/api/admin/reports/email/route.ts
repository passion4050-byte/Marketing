import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { tenantId?: string; period?: string };
  if (!body.tenantId) return NextResponse.json({ ok: false, error: 'tenantId required' }, { status: 400 });

  const key = process.env.RESEND_API_KEY;
  const fromAddr = process.env.RESEND_FROM ?? 'MEDIMAP GEO <reports@medimap.team>';
  const reportUrl = `${req.nextUrl.origin}/admin/reports/${body.tenantId}`;

  if (!key) {
    return NextResponse.json({ ok: false, stub: true, reportUrl, message: 'RESEND_API_KEY not set' });
  }

  const to = process.env.ADMIN_EMAIL ?? 'admin@medimap.team';
  const subject = `[MEDIMAP GEO] ${body.period ?? '월간'} 보고서 — ${body.tenantId}`;
  const html = `
<p>안녕하세요,</p>
<p>${body.period ?? '이번 달'} 보고서가 준비되었습니다.</p>
<p><a href="${reportUrl}" style="display:inline-block;background:#1B68FF;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">보고서 보기</a></p>
<p style="color:#64748B;font-size:12px;">MEDIMAP GEO · Hospital AI Platform</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddr, to, subject, html })
    });
    const data = await res.json();
    return NextResponse.json({ ok: res.ok, to, reportUrl, resend: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
