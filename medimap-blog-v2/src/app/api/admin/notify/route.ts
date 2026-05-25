/**
 * POST /api/admin/notify
 *
 * Slack/Email/카카오톡 알림 통합 endpoint.
 * 운영 환경에서 channel 별 webhook URL 설정.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Body {
  channel: 'slack' | 'email' | 'kakao';
  level: 'info' | 'warning' | 'critical';
  subject: string;
  body: string;
  tenantId?: string;
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Body;
  if (!b.subject || !b.body || !b.channel) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }

  // Slack
  if (b.channel === 'slack') {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return NextResponse.json({ ok: false, error: 'SLACK_WEBHOOK_URL not set', stub: true });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*[${b.level.toUpperCase()}] ${b.subject}*\n${b.body}` + (b.tenantId ? `\n_tenant: ${b.tenantId}_` : '')
      })
    });
    return NextResponse.json({ ok: res.ok });
  }

  // Email (Resend stub)
  if (b.channel === 'email') {
    const key = process.env.RESEND_API_KEY;
    const to = process.env.ADMIN_EMAIL;
    if (!key || !to) return NextResponse.json({ ok: false, error: 'RESEND env not set', stub: true });
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MEDIMAP GEO <alerts@medimap.team>',
        to,
        subject: `[${b.level}] ${b.subject}`,
        text: b.body
      })
    });
    return NextResponse.json({ ok: res.ok });
  }

  // KakaoTalk Biz (placeholder)
  if (b.channel === 'kakao') {
    return NextResponse.json({ ok: false, error: 'kakao biz API integration pending', stub: true });
  }

  return NextResponse.json({ ok: false, error: 'unknown channel' }, { status: 400 });
}
