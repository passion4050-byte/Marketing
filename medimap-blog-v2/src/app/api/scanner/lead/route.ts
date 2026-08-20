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

/**
 * 고객에게 무료 진단 결과 리포트 메일 발송 (best-effort).
 * 🔴 임의 고객 주소 발송은 RESEND_FROM 이 인증된 도메인(alerts@wecircle.co.kr)일 때만 실제 도달.
 *    미설정(onboarding@resend.dev)이면 Resend 가 본인 외 수신 거부 → try/catch 로 무시.
 */
async function sendCustomerReport(b: Body): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = b.email?.trim();
  if (!key || !to) return;
  const KAKAO = 'https://open.kakao.com/o/sKsVE9Wg';
  const from = process.env.RESEND_FROM ?? 'WECIRCLE GEO <onboarding@resend.dev>';
  const score = typeof b.overallScore === 'number' ? b.overallScore : null;
  const grade = b.grade ?? '-';
  const comp =
    b.complianceStatus === 'fail' ? { t: '의료광고법 위반 위험 항목 발견', c: '#DC2626' }
    : b.complianceStatus === 'warn' ? { t: '의료광고법 주의 표현 있음', c: '#D97706' }
    : b.complianceStatus === 'pass' ? { t: '의료광고법 리스크 낮음', c: '#059669' }
    : { t: '-', c: '#64748B' };
  const subject = `[WECIRCLE GEO] ${b.org ?? '병원'} 무료 AI 검색 진단 결과 안내`;
  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#0F172A">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#1B68FF;text-transform:uppercase">WECIRCLE GEO · 무료 AI 검색 진단</div>
  <h1 style="margin:8px 0 4px;font-size:22px">${b.name ?? '담당자'}님, 진단 결과를 보내드립니다.</h1>
  <p style="color:#475569;font-size:14px;line-height:1.8;margin:0 0 20px">
    ${b.org ?? '병원'}의 AI 검색(ChatGPT·Gemini·Perplexity) 노출·인용 최적화 상태를 진단한 결과입니다.
  </p>
  <div style="border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:20px">
    <table style="width:100%;font-size:14px;line-height:2;border-collapse:collapse">
      <tr><td style="color:#64748B;width:130px">진단 대상</td><td style="font-weight:600">${b.domain ?? b.url ?? '-'}</td></tr>
      <tr><td style="color:#64748B">종합 점수</td><td style="font-weight:800;font-size:18px;color:#1B68FF">${score !== null ? score + '점 · ' + grade + '등급' : '-'}</td></tr>
      <tr><td style="color:#64748B">의료광고법</td><td style="font-weight:700;color:${comp.c}">${comp.t}</td></tr>
    </table>
  </div>
  <p style="color:#475569;font-size:14px;line-height:1.8;margin:0 0 8px">
    항목별 상세 점수와 <strong>맞춤 개선안</strong>은 위서클 컨설턴트가 정리해 <strong>무료로</strong> 안내드립니다.
    빠른 상담을 원하시면 아래 카카오톡으로 바로 연결됩니다.
  </p>
  <div style="margin:22px 0">
    <a href="${KAKAO}" style="display:inline-block;background:#1B68FF;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:10px">카카오톡으로 상담받기 →</a>
  </div>
  <p style="color:#94A3B8;font-size:12px;line-height:1.7;border-top:1px solid #E2E8F0;padding-top:16px;margin-top:24px">
    본 메일은 무료 GEO 진단을 신청하신 분께 결과 안내를 위해 발송되었습니다.<br>
    주식회사 위서클 · 서울특별시 서초구 사임당로 8길 13
  </p>
</div>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html })
    });
  } catch {
    // 고객 발송 실패는 무시 — 리드 저장·운영자 알림 우선
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
  // 고객에게 진단 결과 리포트 발송 (RESEND_FROM 인증 도메인일 때 실제 도달)
  await sendCustomerReport(b);

  return NextResponse.json({ ok: true });
}
