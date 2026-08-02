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
import { computeReportMetrics, type ReportMetrics } from '@/lib/reportMetrics';
import { buildReportUrl, periodKeyFromLabel } from '@/lib/reportToken';

/**
 * 🔴 Round 144 — 클라이언트 발송 게이트 (G2 숫자 정합 + G4 수신자 유효성).
 *
 * E2E 감사 배경: 기존에는 아무 검증 없이 Resend 로 바로 발송했고, 지표는
 * mentions(브랜드 언급)를 "AI 인용"으로 라벨링하고 있었음. 수신자가 전부
 * 운영자 본인이라 우연히 사고가 안 났을 뿐, 클라이언트 이메일을 등록하는
 * 순간 실측의 수십 배 숫자가 발송되는 구조였음.
 */
function reportSendGate(
  toEmail: string | null,
  m: ReportMetrics,
): { ok: true } | { ok: false; reason: string } {
  const email = (toEmail ?? '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, reason: '수신 이메일 형식 오류' };
  }
  // G4 — 운영자 본인 주소로는 "클라이언트 발송"으로 집계하지 않음.
  const operatorEmails = (process.env.OPERATOR_EMAILS ?? 'passion4050@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (operatorEmails.includes(email)) {
    return { ok: false, reason: '운영자 본인 주소 — 클라이언트 발송 대상 아님' };
  }
  // G2 — 숫자 정합. 인용 수가 (측정 질의 × 엔진 4) 를 넘으면 계산 오류.
  const maxPlausible = Math.max(1, m.queries30d) * 4;
  if (m.ownCitations30d > maxPlausible || m.clientSiteCitations30d > maxPlausible) {
    return { ok: false, reason: '인용 수가 측정 질의 대비 비현실적 — 지표 계산 점검 필요' };
  }
  if (m.avgAeo != null && (m.avgAeo < 0 || m.avgAeo > 100)) {
    return { ok: false, reason: 'AEO 점수 범위 이탈' };
  }
  return { ok: true };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function sendOne(opts: {
  tenantId: string | number;
  tenantName: string;
  toEmail: string;
  period: string;
  origin: string;
  range?: string;
  from?: string;
  to?: string;
  metrics?: ReportMetrics;
}): Promise<{ ok: boolean; to?: string; reportUrl: string; resend?: unknown; stub?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const fromAddr = process.env.RESEND_FROM ?? 'WECIRCLE GEO <reports@medimap.team>';

  // 🔴 Round 144 (2026-08-02) — 클라이언트용 공개 보고서 링크로 교체.
  //   기존 CTA 는 `/admin/reports/{id}` 를 가리켰는데 middleware 가 `/admin/*` 전체를
  //   admin 쿠키로 막아 **클라이언트는 로그인 화면으로 튕겼음**. 즉 보고서 메일의
  //   버튼이 한 번도 동작한 적이 없음(수신자가 운영자 본인이라 드러나지 않았을 뿐).
  //   `/report/{id}/{yyyy-MM}?t=` 서명 링크 — 로그인 없이 자기 것만 열람.
  //   (`/r/` 는 ShortLink 라우트라 세그먼트명 충돌 — Round 144 실사고)
  const periodKey = periodKeyFromLabel(opts.period);
  const publicUrl = buildReportUrl(opts.origin, opts.tenantId, periodKey);
  const reportUrl = publicUrl ?? `${opts.origin}/admin/reports/${opts.tenantId}`;

  if (!key) {
    return { ok: false, stub: true, reportUrl };
  }
  if (!publicUrl) {
    // 시크릿 미설정 → 링크가 admin 경로로 떨어져 클라이언트가 못 엶. 발송하지 않음.
    return {
      ok: false,
      reportUrl,
      error: 'REPORT_TOKEN_SECRET(또는 ADMIN_SESSION_SECRET) 미설정 — 공개 보고서 링크 생성 불가',
    };
  }

  // Round 114 P1-3: period 안에 "(최근 30일" 포함 여부로 본문 문구 조건부 처리.
  const _isRolling = opts.period.includes('최근 30일');
  const _periodShort = _isRolling ? '최근 30일' : '이번 달';
  const subject = `[WECIRCLE GEO] ${opts.period} 월간 AI 검색 노출 보고서 — ${opts.tenantName}`;
  const m = opts.metrics;
  const metricsBlock = m
    ? `
  <div style="display:flex;gap:8px;margin:16px 0">
    <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 6px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#1B68FF">${m.mentions30d}</div>
      <div style="font-size:11px;color:#64748B">AI 답변 내 병원명 등장 (30일)</div>
    </div>
    <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 6px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#15CBA8">${m.clientSiteCitations30d}</div>
      <div style="font-size:11px;color:#64748B">병원 홈페이지가 출처로 인용</div>
    </div>
    <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 6px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#0F172A">${m.ownCitations30d}</div>
      <div style="font-size:11px;color:#64748B">위서클 콘텐츠가 출처로 인용</div>
    </div>
  </div>
  <p style="font-size:11px;color:#64748B;line-height:1.6;margin:0 0 12px">
    ※ <b>등장</b>은 AI 답변 본문에 병원 이름이 언급된 횟수이고, <b>출처 인용</b>은 AI 가 답변의 근거 URL 로
    해당 사이트를 실제로 표기한 횟수입니다. 두 지표는 서로 다르며, 등장이 곧 우리 콘텐츠의 성과를 의미하지 않습니다.
    (30일 측정 질의 ${m.queries30d.toLocaleString()}회 기준 · 발행 ${m.published30d}편)
  </p>
  ${m.topContent ? `<p style="font-size:12px;color:#334155;margin:0 0 12px">🏆 최고 AEO 콘텐츠: <b>${m.topContent.title}</b> (${m.topContent.aeo}점)</p>` : ''}`
    : '';
  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="border-bottom:2px solid #1B68FF;padding-bottom:12px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#1B68FF;text-transform:uppercase">WECIRCLE GEO Monthly Report</div>
    <h1 style="margin:6px 0 0;font-size:22px">${opts.tenantName}</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#64748B">${opts.period} 월간 AI 검색 노출 성과 보고</p>
  </div>
  <p style="font-size:14px;line-height:1.6">안녕하세요, ${opts.tenantName} 운영진 여러분.</p>
  <p style="font-size:14px;line-height:1.6">${_periodShort} 4대 AI 엔진 (Gemini · Claude · Perplexity · OpenAI) 의 grounding 데이터 기반 월간 보고서가 준비되었습니다.</p>
  ${metricsBlock}
  <p style="font-size:14px;line-height:1.6">보고서에는 다음 내용이 포함됩니다:</p>
  <ul style="font-size:13px;line-height:1.7;color:#334155">
    <li>${_periodShort} AI 답변 내 병원명 등장 추이 (전월 대비)</li>
    <li>실제 출처로 인용된 URL 목록 (병원 홈페이지 · 위서클 콘텐츠 구분)</li>
    <li>키워드별 성과 + 보강 필요 키워드</li>
    <li>경쟁사 노출 현황 Top 5</li>
    <li>다음 달 액션 플랜</li>
  </ul>
  <div style="text-align:center;margin:24px 0">
    <a href="${reportUrl}" style="display:inline-block;background:#1B68FF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">보고서 보기 →</a>
  </div>
  <p style="font-size:12px;color:#64748B;line-height:1.6">PDF 저장이 필요하시면 보고서 화면 상단의 [PDF 저장 / 인쇄] 버튼을 클릭해 주세요.</p>
  <hr style="border:0;border-top:1px solid #E2E8F0;margin:24px 0">
  <p style="font-size:11px;color:#94A3B8;line-height:1.5">
    WECIRCLE GEO/AEO SaaS · AI 검색 시대 의료 마케팅 솔루션<br>
    wecircle.co.kr · 이 보고서는 매월 1일 발송됩니다.
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
    tenantId?: string | number;
    period?: string;
    all?: boolean;
    cronSecret?: string;
    range?: string;
    from?: string;
    to?: string;
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
      const metrics = await computeReportMetrics(sb, tt.id);

      // 🔴 Round 144 발송 게이트 — 통과 못 하면 발송하지 않고 사유를 반환.
      const gate = reportSendGate(tt.email, metrics);
      if (!gate.ok) {
        results.push({
          tenantId: tt.id,
          tenantName: tt.name,
          ok: false,
          reportUrl: `${origin}/admin/reports/${tt.id}`,
          error: `발송 게이트 차단: ${gate.reason}`,
        });
        continue;
      }

      const r = await sendOne({
        tenantId: tt.id,
        tenantName: tt.name,
        toEmail: tt.email,
        period,
        origin,
        metrics,
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

  const metrics = sb ? await computeReportMetrics(sb, body.tenantId) : undefined;
  const r = await sendOne({
    tenantId: body.tenantId,
    tenantName,
    toEmail,
    period,
    origin,
    range: body.range,
    from: body.from,
    to: body.to,
    metrics,
  });
  return NextResponse.json(r);
}
