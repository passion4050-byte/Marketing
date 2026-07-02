/**
 * Round 48 (2026-05-31) — 월간 보고서 이메일 발송.
 *
 * POST /api/admin/reports/email
 *   body: { tenantId, period? }                    — 단일 tenant 즉시 발송
 *   body: { all: true, period?, cronSecret? }      — 모든 tenant (email 있는) 일괄 발송 (cron 용)
 *
 * to: tenant.email 우선 (Round 48), fallback ADMIN_EMAIL
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function sendOne(opts: {
  tenantId: string | number;
  tenantName: string;
  toEmail: string;
  period: string;
  origin: string;
}): Promise<{ ok: boolean; to?: string; reportUrl: string; resend?: unknown; stub?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const fromAddr = process.env.RESEND_FROM ?? 'WECIRCLE GEO <reports@medimap.team>';
  const reportUrl = `${opts.origin}/admin/reports/${opts.tenantId}`;

  if (!key) {
    return { ok: false, stub: true, reportUrl };
  }

  // Round 114 P1-3: period 안에 "(최근 30일" 포함 여부로 본문 문구 조건부 처리.
  const _isRolling = opts.period.includes('최근 30일');
  const _periodShort = _isRolling ? '최근 30일' : '이번 달';
  const subject = `[WECIRCLE GEO] ${opts.period} 월간 AI 검색 노출 보고서 — ${opts.tenantName}`;
  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="border-bottom:2px solid #1B68FF;padding-bottom:12px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#1B68FF;text-transform:uppercase">WECIRCLE GEO Monthly Report</div>
    <h1 style="margin:6px 0 0;font-size:22px">${opts.tenantName}</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#64748B">${opts.period} 월간 AI 검색 노출 성과 보고</p>
  </div>
  <p style="font-size:14px;line-height:1.6">안녕하세요, ${opts.tenantName} 운영진 여러분.</p>
  <p style="font-size:14px;line-height:1.6">${_periodShort} 4대 AI 엔진 (Gemini · Claude · Perplexity · OpenAI) 의 grounding 데이터 기반 월간 보고서가 준비되었습니다.</p>
  <p style="font-size:14px;line-height:1.6">보고서에는 다음 내용이 포함됩니다:</p>
  <ul style="font-size:13px;line-height:1.7;color:#334155">
    <li>${_periodShort} AI 검색 인용 횟수 + 위서클 도메인 점유율 (전월 대비)</li>
    <li>키워드별 성과 + 보강 필요 키워드</li>
    <li>경쟁사 노출 현황 Top 5</li>
    <li>파트너별 인용 랭킹 (30일) + 자사 발행 콘텐츠 성과</li>
    <li>다음 달 액션 플랜 4개</li>
  </ul>
  <div style="text-align:center;margin:24px 0">
    <a href="${reportUrl}" style="display:inline-block;background:#1B68FF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">보고서 보기 →</a>
  </div>
  <p style="font-size:12px;color:#64748B;line-height:1.6">PDF 저장이 필요하시면 보고서 화면 상단의 [PDF 저장 / 인쇄] 버튼을 클릭해 주세요.</p>
  <hr style="border:0;border-top:1px solid #E2E8F0;margin:24px 0">
  <p style="font-size:11px;color:#94A3B8;line-height:1.5">
    WECIRCLE GEO/AEO SaaS · AI 검색 시대 의료 마케팅 솔루션<br>
    wecircle.co.kr · 이 보고서는 매월 1일 자동 발송됩니다.
  </p>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddr, to: opts.toEmail, subject, html }),
    });
    const data = await res.json();
    return { ok: res.ok, to: opts.toEmail, reportUrl, resend: data };
  } catch (err) {
    return { ok: false, error: (err as Error).message, reportUrl };
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    tenantId?: string;
    period?: string;
    all?: boolean;
    cronSecret?: string;
  };
  // Round 114 P1-3 (2026-07-02): 리포트 페이지의 rolling 30일 라벨과 정합.
  // 이번 달이 30일 미만이면 "(최근 30일 기준)" 병기.
  const _emailNow = new Date();
  const _emailMonthStart = new Date(_emailNow.getFullYear(), _emailNow.getMonth(), 1);
  const _emailThirtyDaysAgo = new Date(_emailNow.getTime() - 30 * 24 * 60 * 60 * 1000);
  const _emailIsRolling30d = _emailMonthStart.getTime() >= _emailThirtyDaysAgo.getTime();
  const _emailMonthLabel = _emailNow.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  const period = body.period ?? (_emailIsRolling30d ? `${_emailMonthLabel} (최근 30일 기준)` : _emailMonthLabel);
  const origin = req.nextUrl.origin;

  // Round 48 — all=true 모드 (cron 일괄 발송)
  // Round 53 (2026-05-31) — today.day 와 tenant.report_send_day 일치하는 tenant 만 발송.
  //   cron 이 매일 실행되더라도 클라이언트별 발송일에 맞춰 분기됨.
  //   force=true 면 today_day 필터 무시 (수동 manual run 용).
  if (body.all) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && body.cronSecret !== cronSecret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const sb = getServerClient();
    if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

    // KST (UTC+9) 기준 오늘 일자
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayDay = kstNow.getUTCDate(); // 1~31
    const force = (body as { force?: boolean }).force === true;

    let query = sb
      .from('tenants')
      .select('id, name, email, report_send_day')
      .not('email', 'is', null)
      .neq('email', '');
    if (!force) {
      // report_send_day 가 today_day 와 일치하는 tenant 만
      query = query.eq('report_send_day', todayDay);
    }
    const { data: tenants } = await query;

    const results: Array<Awaited<ReturnType<typeof sendOne>> & { tenantId: number; tenantName: string }> = [];
    for (const t of tenants ?? []) {
      const tt = t as { id: number; name: string; email: string };
      const r = await sendOne({
        tenantId: tt.id,
        tenantName: tt.name,
        toEmail: tt.email,
        period,
        origin,
      });
      results.push({ tenantId: tt.id, tenantName: tt.name, ...r });
    }

    return NextResponse.json({
      ok: true,
      period,
      today_day: todayDay,
      force,
      total: results.length,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  }

  // 단일 tenant 모드
  if (!body.tenantId) return NextResponse.json({ ok: false, error: 'tenantId required' }, { status: 400 });

  const sb = getServerClient();
  let tenantName = String(body.tenantId);
  let toEmail = process.env.ADMIN_EMAIL ?? 'admin@medimap.team';
  if (sb) {
    const { data: t } = await sb
      .from('tenants')
      .select('name, email')
      .eq('id', body.tenantId)
      .single();
    if (t) {
      tenantName = (t as { name: string }).name;
      const e = (t as { email: string | null }).email;
      if (e) toEmail = e;
    }
  }

  const r = await sendOne({
    tenantId: body.tenantId,
    tenantName,
    toEmail,
    period,
    origin,
  });
  return NextResponse.json(r);
}
