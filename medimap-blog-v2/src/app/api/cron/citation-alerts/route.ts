/**
 * Round 110-A (2026-07-02) — 신규 AI 인용 감지 → 이메일 알림.
 *
 * GET|POST /api/cron/citation-alerts?cronSecret=xxx
 *
 * 로직:
 *   1. 최근 24h 신규 mentions (is_target=true) 조회
 *   2. tenant 별 그룹핑 + engine 별 breakdown
 *   3. 신규 인용이 1건 이상이면 passion4050@gmail.com 로 요약 이메일 발송
 *   4. 없으면 알림 skip (스팸 방지)
 *
 * 카카오톡 알림 관련 노트:
 *   - 개인 카카오톡: 카카오 공식 API 없음 (스팸 방지)
 *   - 카카오 알림톡(Bizmessage): 사업자 등록 + 템플릿 사전 승인 필요 (2~4주)
 *   - 대안: 이메일 (즉시), Telegram Bot API (즉시), Discord webhook (즉시)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.CITATION_ALERT_EMAIL ?? 'passion4050@gmail.com';

interface TenantSummary {
  tenant_id: number;
  tenant_name: string;
  domain_category: string | null;
  new_mentions_24h: number;
  engines: Record<string, number>;
  keywords: Set<string>;
  sample_urls: string[];
}

async function sendAlertEmail(opts: {
  origin: string;
  totalNew: number;
  tenantSummaries: TenantSummary[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string; resend?: unknown }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };

  const fromAddr = process.env.RESEND_FROM ?? 'WECIRCLE GEO <reports@medimap.team>';
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = `${kstNow.getUTCFullYear()}-${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}-${String(kstNow.getUTCDate()).padStart(2, '0')}`;
  const subject = `[WECIRCLE] 신규 AI 인용 ${opts.totalNew}건 감지 (${dateStr})`;

  const rows = opts.tenantSummaries.map((t) => {
    const engineChips = Object.entries(t.engines)
      .sort(([, a], [, b]) => b - a)
      .map(([eng, cnt]) => `<span style="display:inline-block;background:#EEF2FF;color:#4F5DF8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;margin-right:4px">${eng} ${cnt}</span>`)
      .join('');
    return `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">${t.tenant_name}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B">${t.domain_category ?? '-'}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:900;color:#1B68FF;font-size:18px">+${t.new_mentions_24h}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #E2E8F0">${engineChips}</td>
    </tr>`;
  }).join('');

  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="border-bottom:2px solid #1B68FF;padding-bottom:12px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#1B68FF;text-transform:uppercase">WECIRCLE Citation Alert</div>
    <h1 style="margin:6px 0 0;font-size:22px">신규 AI 인용 <span style="color:#1B68FF">${opts.totalNew}건</span> 감지</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#64748B">${dateStr} KST · 최근 24시간 기준</p>
  </div>
  <p style="font-size:14px;line-height:1.6">위서클 파트너 병·의원 관련 콘텐츠가 최근 24시간 동안 AI 검색엔진에서 인용된 신규 건입니다.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px">
    <thead>
      <tr style="background:#F8FAFC">
        <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px">파트너</th>
        <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px">카테고리</th>
        <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px">신규 인용</th>
        <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px">엔진 분포</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="text-align:center;margin:24px 0">
    <a href="${opts.origin}/admin" style="display:inline-block;background:#1B68FF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">어드민 대시보드 →</a>
  </div>
  <hr style="border:0;border-top:1px solid #E2E8F0;margin:24px 0">
  <p style="font-size:11px;color:#94A3B8;line-height:1.5">
    WECIRCLE GEO/AEO SaaS · AI 검색 시대 의료 마케팅 솔루션<br>
    wecircle.co.kr · 이 알림은 매일 KST 09:00 에 자동 발송됩니다 (신규 인용 발생 시).
  </p>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddr, to: ADMIN_EMAIL, subject, html }),
    });
    const data = await res.json();
    return { ok: res.ok, resend: data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const cronSecret = url.searchParams.get('cronSecret') ?? req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  if (expected && cronSecret !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const now = new Date();
  const d24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 최근 24h 신규 인용
  const { data: mentions, error: menErr } = await sb
    .from('mentions')
    .select('tenant_id, response_id, created_at, source_url, is_target')
    .eq('is_target', true)
    .gte('created_at', d24);
  if (menErr) return NextResponse.json({ ok: false, error: menErr.message }, { status: 500 });

  const mentionsArr = mentions ?? [];
  if (mentionsArr.length === 0) {
    return NextResponse.json({
      ok: true,
      total_new: 0,
      skipped: true,
      reason: 'no new citations in last 24h',
    });
  }

  // tenant + engine 매핑
  const tenantIds = Array.from(new Set(mentionsArr.map((m) => m.tenant_id)));
  const responseIds = Array.from(new Set(mentionsArr.map((m) => m.response_id).filter(Boolean)));

  const [{ data: tenants }, { data: responses }] = await Promise.all([
    sb.from('tenants').select('id, name, domain_category').in('id', tenantIds),
    responseIds.length > 0
      ? sb.from('responses').select('id, query_id').in('id', responseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const queryIds = Array.from(new Set((responses ?? []).map((r) => r.query_id).filter(Boolean)));
  const { data: queries } = queryIds.length > 0
    ? await sb.from('queries').select('id, engine').in('id', queryIds)
    : { data: [] };

  const responseToEngine = new Map<number, string>();
  const queryToEngine = new Map<number, string>();
  (queries ?? []).forEach((q) => queryToEngine.set(q.id, q.engine || 'unknown'));
  (responses ?? []).forEach((r) => {
    responseToEngine.set(r.id, queryToEngine.get(r.query_id) || 'unknown');
  });

  const tenantMap = new Map<number, { name: string; domain_category: string | null }>();
  (tenants ?? []).forEach((t) => tenantMap.set(t.id, { name: t.name, domain_category: t.domain_category }));

  const summaries = new Map<number, TenantSummary>();
  mentionsArr.forEach((m) => {
    const t = tenantMap.get(m.tenant_id);
    if (!t) return;
    let s = summaries.get(m.tenant_id);
    if (!s) {
      s = {
        tenant_id: m.tenant_id,
        tenant_name: t.name,
        domain_category: t.domain_category,
        new_mentions_24h: 0,
        engines: {},
        keywords: new Set(),
        sample_urls: [],
      };
      summaries.set(m.tenant_id, s);
    }
    s.new_mentions_24h += 1;
    const eng = responseToEngine.get(m.response_id) || 'unknown';
    s.engines[eng] = (s.engines[eng] || 0) + 1;
    if (m.source_url && s.sample_urls.length < 3) s.sample_urls.push(m.source_url);
  });

  const tenantSummaries = Array.from(summaries.values()).sort(
    (a, b) => b.new_mentions_24h - a.new_mentions_24h,
  );
  const totalNew = mentionsArr.length;

  const email = await sendAlertEmail({
    origin: url.origin,
    totalNew,
    tenantSummaries,
  });

  return NextResponse.json({
    ok: true,
    total_new: totalNew,
    tenants: tenantSummaries.length,
    email,
    generated_at: now.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
