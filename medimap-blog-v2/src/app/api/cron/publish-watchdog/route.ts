/**
 * Round 188 (2026-09-02) — 발행 스케줄 감시자.
 *
 * GET|POST /api/cron/publish-watchdog?cronSecret=xxx
 *
 * ## 왜 만들었나
 * Round 187 실측: GitHub Actions 발행 cron 이 예정대로 돌지 않는다.
 *   지연 폭 29분 ~ 6시간 30분, 스케줄 9회 중 성공 6회(유효 가동률 약 65%).
 *   2026-09-02 05:00 UTC 슬롯은 2시간 40분째 미발사 + 큐에도 없었다.
 * "병원당 주 3회" 정책 대비 실제 발행량이 2/3 이하인데 **아무도 모르고 있었다.**
 *
 * ## 🔴 감시자를 GitHub Actions 에 두면 안 된다
 * 감시 대상과 같은 스케줄러를 쓰면 발행이 안 돈 날은 감시자도 안 돈다(순환).
 * 그래서 이 엔드포인트는 **Supabase pg_cron + pg_net** 이 호출한다.
 * (db/supabase/round188_publish_watchdog_cron.sql 참조)
 *
 * ## 두 가지를 본다
 * 1. **전면 정지** — 마지막 발행이 `PUBLISH_WATCHDOG_STALE_HOURS`(기본 26h) 이전이면
 *    cron 자체가 안 돈 것이다. 해외 발행이 매일 06:00 UTC 라 정상이면 26h 를 넘을 수 없다.
 * 2. **개별 굶김** — 활성(enabled + status active) 테넌트 중 마지막 ko 발행이
 *    `PUBLISH_WATCHDOG_TENANT_DAYS`(기본 10일) 이전인 곳. 로테이션이 도는데도
 *    특정 병원만 굶는 경우를 잡는다(Round 174c 가 고쳤던 문제의 재발 감지).
 *
 * 둘 다 정상이면 이메일을 보내지 않는다(스팸 방지 — citation-alerts 와 동일 정책).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.CITATION_ALERT_EMAIL ?? 'passion4050@gmail.com';
const STALE_HOURS = Number(process.env.PUBLISH_WATCHDOG_STALE_HOURS ?? 26);
const TENANT_STALE_DAYS = Number(process.env.PUBLISH_WATCHDOG_TENANT_DAYS ?? 10);

interface StarvingTenant {
  tenant_id: number;
  name: string;
  last_published_at: string | null;
  days_since: number | null;
}

function kstDateStr(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

async function sendAlertEmail(opts: {
  hoursSinceLast: number | null;
  lastPublishedAt: string | null;
  globalStalled: boolean;
  starving: StarvingTenant[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string; resend?: unknown }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };

  const fromAddr = process.env.RESEND_FROM ?? 'WECIRCLE GEO <reports@medimap.team>';
  const dateStr = kstDateStr();
  const subject = opts.globalStalled
    ? `[WECIRCLE] 🔴 발행 중단 감지 — ${opts.hoursSinceLast ?? '?'}시간째 발행 0건 (${dateStr})`
    : `[WECIRCLE] 굶는 병원 ${opts.starving.length}곳 감지 (${dateStr})`;

  const globalBlock = opts.globalStalled
    ? `
  <div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:14px 16px;margin:16px 0;border-radius:4px">
    <div style="font-weight:900;color:#DC2626;font-size:15px">전면 발행 중단</div>
    <p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#7F1D1D">
      마지막 발행: <b>${opts.lastPublishedAt ?? '기록 없음'}</b> (${opts.hoursSinceLast ?? '?'}시간 전)<br>
      해외 발행 cron 이 매일 도는 구조라 정상이면 ${STALE_HOURS}시간을 넘을 수 없습니다.<br>
      <b>GitHub Actions 스케줄 미발사를 먼저 의심하세요</b> — 코드가 아니라 스케줄러 문제인
      경우가 실측상 더 많습니다(Round 187: 유효 가동률 약 65%).
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#991B1B">
      확인: <code>gh run list --workflow=auto-publish.yml</code> ·
      복구: 같은 워크플로를 <code>workflow_dispatch</code> 로 수동 실행
    </p>
  </div>`
    : '';

  const starvingRows = opts.starving
    .map(
      (t) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">${t.name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B">${t.last_published_at ?? '발행 이력 없음'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:900;color:#DC2626">${t.days_since ?? '—'}일</td>
    </tr>`,
    )
    .join('');

  const starvingBlock = opts.starving.length
    ? `
  <h2 style="margin:24px 0 8px;font-size:16px">${TENANT_STALE_DAYS}일 이상 발행이 없는 활성 병원</h2>
  <p style="margin:0 0 10px;font-size:13px;color:#64748B">
    로테이션에 포함돼 있는데도 발행이 없다면 키워드 풀 소진(상한 도달) 또는
    스케줄 미발사입니다. 어드민에서 일시정지한 곳은 여기 나오지 않습니다.
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="background:#F8FAFC">
        <th style="padding:8px;text-align:left;font-size:11px;color:#64748B">병원</th>
        <th style="padding:8px;text-align:left;font-size:11px;color:#64748B">마지막 발행</th>
        <th style="padding:8px;text-align:right;font-size:11px;color:#64748B">경과</th>
      </tr>
    </thead>
    <tbody>${starvingRows}</tbody>
  </table>`
    : '';

  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="border-bottom:2px solid #DC2626;padding-bottom:12px;margin-bottom:8px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#DC2626;text-transform:uppercase">WECIRCLE Publish Watchdog</div>
    <h1 style="margin:6px 0 0;font-size:22px">발행 파이프라인 이상 감지</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#64748B">${dateStr} KST</p>
  </div>
  ${globalBlock}
  ${starvingBlock}
  <p style="margin-top:24px;font-size:11px;color:#94A3B8;line-height:1.6">
    이 감시자는 <b>Supabase pg_cron</b> 이 호출합니다 — 감시 대상(GitHub Actions)과
    다른 스케줄러를 쓰는 것이 핵심입니다. 같은 스케줄러면 발행이 안 돈 날 감시자도 안 됩니다.<br>
    이상이 없으면 메일을 보내지 않습니다.
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

  // ── 1) 전면 정지 판정 — 전체에서 가장 최근 발행 1건
  const { data: lastRows, error: lastErr } = await sb
    .from('generated_contents')
    .select('published_at')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1);
  if (lastErr) {
    return NextResponse.json({ ok: false, error: lastErr.message }, { status: 500 });
  }

  const lastPublishedAt: string | null = lastRows?.[0]?.published_at ?? null;
  const hoursSinceLast = lastPublishedAt
    ? Math.floor((Date.now() - new Date(lastPublishedAt).getTime()) / 3_600_000)
    : null;
  const globalStalled = hoursSinceLast === null || hoursSinceLast >= STALE_HOURS;

  // ── 2) 개별 굶김 판정 — 활성 테넌트별 마지막 ko 발행
  //    ⚠ auto_content_settings.enabled 와 tenants.status 를 **둘 다** 본다.
  //      Round 174i 실사고: 어드민 일시정지는 tenants.status 만 바꾸고
  //      enabled 는 그대로라 두 플래그가 갈라진다.
  const { data: tenants, error: tErr } = await sb
    .from('tenants')
    .select('id, name, status');
  if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });

  const { data: settings, error: sErr } = await sb
    .from('auto_content_settings')
    .select('tenant_id, enabled');
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  const enabledIds = new Set(
    (settings ?? []).filter((s) => s.enabled === true).map((s) => s.tenant_id as number),
  );
  const activeTenants = (tenants ?? []).filter((t) => {
    const st = String(t.status ?? 'active').trim().toLowerCase();
    return enabledIds.has(t.id as number) && st !== 'paused' && st !== 'churned';
  });

  const staleCutoff = Date.now() - TENANT_STALE_DAYS * 86_400_000;
  const starving: StarvingTenant[] = [];
  for (const t of activeTenants) {
    const { data: rows } = await sb
      .from('generated_contents')
      .select('published_at')
      .eq('tenant_id', t.id)
      .eq('status', 'published')
      .eq('channel', 'blog_html')
      .eq('lang', 'ko')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1);
    const last: string | null = rows?.[0]?.published_at ?? null;
    const ts = last ? new Date(last).getTime() : 0;
    if (ts < staleCutoff) {
      starving.push({
        tenant_id: t.id as number,
        name: String(t.name ?? `tenant ${t.id}`),
        last_published_at: last,
        days_since: last ? Math.floor((Date.now() - ts) / 86_400_000) : null,
      });
    }
  }
  starving.sort((a, b) => (b.days_since ?? 9999) - (a.days_since ?? 9999));

  const shouldAlert = globalStalled || starving.length > 0;
  if (!shouldAlert) {
    return NextResponse.json({
      ok: true,
      alerted: false,
      reason: 'healthy',
      last_published_at: lastPublishedAt,
      hours_since_last: hoursSinceLast,
      active_tenants: activeTenants.length,
      thresholds: { stale_hours: STALE_HOURS, tenant_stale_days: TENANT_STALE_DAYS },
    });
  }

  const email = await sendAlertEmail({
    hoursSinceLast,
    lastPublishedAt,
    globalStalled,
    starving,
  });

  return NextResponse.json({
    ok: true,
    alerted: true,
    global_stalled: globalStalled,
    last_published_at: lastPublishedAt,
    hours_since_last: hoursSinceLast,
    starving_count: starving.length,
    starving: starving.map((s) => ({ name: s.name, days_since: s.days_since })),
    active_tenants: activeTenants.length,
    thresholds: { stale_hours: STALE_HOURS, tenant_stale_days: TENANT_STALE_DAYS },
    email,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
