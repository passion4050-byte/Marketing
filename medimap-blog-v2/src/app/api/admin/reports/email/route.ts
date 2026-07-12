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
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase';
import { scoreAeo } from '@/lib/aeoScore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 리포트용 tenant 실측 지표 — 30일 발행수 · AI 인용수 · 평균 AEO 점수 · Top 인용 콘텐츠. */
export interface ReportMetrics {
  published30d: number;
  citations30d: number;
  avgAeo: number | null;
  topContent: { title: string; aeo: number } | null;
}

async function computeReportMetrics(
  sb: SupabaseClient,
  tenantId: string | number
): Promise<ReportMetrics> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  // 발행 콘텐츠(30일) + body → AEO 점수
  const { data: contents } = await sb
    .from('generated_contents')
    .select('title, body, raw_qa_pairs, published_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .eq('channel', 'blog_html')
    .gte('published_at', since);
  const list = (contents ?? []) as Array<{
    title: string | null;
    body: string | null;
    raw_qa_pairs: unknown;
    published_at: string | null;
  }>;
  let aeoSum = 0;
  let top: { title: string; aeo: number } | null = null;
  for (const c of list) {
    const faqCount = Array.isArray(c.raw_qa_pairs) ? c.raw_qa_pairs.length : 0;
    const r = scoreAeo({
      body: c.body ?? '',
      faqCount,
      publishedAt: c.published_at,
      hasFaqSchema: faqCount > 0,
      hasMedicalSchema: true,
    });
    aeoSum += r.score;
    if (!top || r.score > top.aeo) top = { title: c.title ?? '(제목 없음)', aeo: r.score };
  }
  const avgAeo = list.length > 0 ? Math.round(aeoSum / list.length) : null;
  // AI 인용수(30일, is_target)
  const { count: citations } = await sb
    .from('mentions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_target', true)
    .gte('created_at', since);
  return {
    published30d: list.length,
    citations30d: citations ?? 0,
    avgAeo,
    topContent: top,
  };
}

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
  // Round 115 (2026-07-02): reportUrl 에도 range 쿼리 반영 → 클라이언트가 링크 클릭 시 같은 기간 리포트 렌더.
  const rangeQ = opts.range ? `?range=${encodeURIComponent(opts.range)}${opts.range === 'custom' && opts.from && opts.to ? `&from=${opts.from}&to=${opts.to}` : ''}` : '';
  const reportUrl = `${opts.origin}/admin/reports/${opts.tenantId}${rangeQ}`;

  if (!key) {
    return { ok: false, stub: true, reportUrl };
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
      <div style="font-size:22px;font-weight:800;color:#1B68FF">${m.citations30d}</div>
      <div style="font-size:11px;color:#64748B">AI 인용 (30일)</div>
    </div>
    <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 6px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#0F172A">${m.published30d}</div>
      <div style="font-size:11px;color:#64748B">발행 콘텐츠</div>
    </div>
    <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 6px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#15CBA8">${m.avgAeo ?? '-'}${m.avgAeo != null ? '점' : ''}</div>
      <div style="font-size:11px;color:#64748B">평균 AEO 점수</div>
    </div>
  </div>
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
