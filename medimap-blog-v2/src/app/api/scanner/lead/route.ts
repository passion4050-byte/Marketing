/**
 * POST /api/scanner/lead
 *
 * 무료 GEO Scanner — 상세 리포트 언락 게이트 + 운영자 실시간 알림.
 *   body: { url, domain, overallScore, grade, complianceStatus, name, org, email, phone, message }
 *   → scanner_leads 에 연락처 포함 리드 저장(lead_captured=true)
 *   → 운영자에게 Resend 이메일 알림(best-effort) → { ok }
 *
 * 이 폼을 제출해야 상세 항목 점수·개선안이 프론트에서 공개된다(리드 확보).
 * 알림 수신: LEAD_NOTIFY_EMAIL → CITATION_ALERT_EMAIL → passion4050@gmail.com (Resend 가입자 본인).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  url?: string;
  domain?: string;
  overallScore?: number;
  grade?: string;
  complianceStatus?: string;
  name?: string;
  org?: string;
  email?: string;
  phone?: string;
  message?: string;
}

async function notifyOperator(b: Body, origin: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.RESEND_FROM ?? 'WECIRCLE GEO <onboarding@resend.dev>';
  const to = process.env.LEAD_NOTIFY_EMAIL ?? process.env.CITATION_ALERT_EMAIL ?? 'passion4050@gmail.com';
  const comp = b.complianceStatus === 'fail' ? '금지 위반' : b.complianceStatus === 'warn' ? '주의' : b.complianceStatus === 'pass' ? '통과' : '-';
  const subject = `[WECIRCLE GEO] 새 스캐너 리드 — ${b.org ?? ''} ${b.name ?? ''}`.trim();
  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="border-bottom:2px solid #1B68FF;padding-bottom:12px;margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#1B68FF;text-transform:uppercase">WECIRCLE GEO · 새 상담 리드</div>
    <h1 style="margin:6px 0 0;font-size:20px">${b.org ?? '-'} · ${b.name ?? '-'}</h1>
  </div>
  <table style="width:100%;font-size:14px;line-height:1.9;border-collapse:collapse">
    <tr><td style="color:#64748B;width:110px">담당자</td><td style="font-weight:600">${b.name ?? '-'}</td></tr>
    <tr><td style="color:#64748B">병원·기관</td><td style="font-weight:600">${b.org ?? '-'}</td></tr>
    <tr><td style="color:#64748B">이메일</td><td>${b.email ?? '-'}</td></tr>
    <tr><td style="color:#64748B">전화</td><td>${b.phone ?? '-'}</td></tr>
    <tr><td style="color:#64748B">진단 대상</td><td>${b.domain ?? b.url ?? '-'}</td></tr>
    <tr><td style="color:#64748B">종합 점수</td><td style="font-weight:700">${typeof b.overallScore === 'number' ? b.overallScore + '점 · ' + (b.grade ?? '') + '등급' : '-'}</td></tr>
    <tr><td style="color:#64748B">의료광고법</td><td>${comp}</td></tr>
    <tr><td style="color:#64748B;vertical-align:top">문의</td><td>${(b.message ?? '-').replace(/</g, '&lt;')}</td></tr>
  </table>
  <div style="margin-top:20px">
    <a href="${origin}/admin/scanner-leads" style="display:inline-block;background:#1B68FF;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:8px">어드민에서 전체 리드 보기 →</a>
  </div>
</div>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html })
    });
  } catch {
    // 알림 실패는 무시 — 리드 저장·언락 우선
  }
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b?.name?.trim() || !b?.email?.trim() || !b?.phone?.trim()) {
    return NextResponse.json({ ok: false, error: '담당자·이메일·전화번호는 필수입니다.' }, { status: 400 });
  }

  try {
    const client = getServerClient();
    if (client) {
      await client.from('scanner_leads').insert({
        url: b.url || null,
        domain: b.domain || null,
        overall_score: typeof b.overallScore === 'number' ? b.overallScore : null,
        compliance_status: b.complianceStatus || null,
        name: b.name.trim(),
        org: b.org?.trim() || null,
        email: b.email.trim(),
        phone: b.phone.trim(),
        message: b.message?.trim() || null,
        lead_captured: true,
        source: 'scanner_lead'
      });
    }
  } catch {
    // 저장 실패해도 사용자 경험 우선 — 언락은 진행
  }

  // 운영자 실시간 알림 (best-effort, 응답 지연 방지 위해 await 하되 실패 무시)
  const origin = req.headers.get('origin') || `https://${req.headers.get('host') ?? 'geo-v2-beta.vercel.app'}`;
  await notifyOperator(b, origin);

  return NextResponse.json({ ok: true });
}
