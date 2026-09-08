/**
 * Round 198 (2026-09-08) — 측정 엔진 감시자.
 *
 * GET|POST /api/cron/measure-watchdog   (헤더 x-cron-secret)
 *
 * ## 왜 만들었나
 * Round 197 실측에서 **엔진이 조용히 빠져 있던 것**을 두 건 발견했다:
 *   - Perplexity: `responses` 에 행이 **0건**. 넉 달간 한 번도 측정된 적이 없다.
 *     `_build_engines()` 가 `PERPLEXITY_API_KEY` 유무로 켜는데 시크릿이 없어
 *     **조용히 skip** 됐다. 경고도 로그 한 줄도 없다.
 *   - Claude: 2026-09-03부터 전량 실패(크레딧 소진 → 400/401). 그런데 배치 로그
 *     헤더에는 `✓ Claude engine 활성` 이 찍히므로 **정상처럼 보인다**.
 * 둘 다 몇 주~넉 달간 아무도 몰랐다. 발행에는 Round 188 감시자가 있는데
 * **측정에는 없었다.**
 *
 * ## 🔴 왜 `responses` 가 아니라 `llm_call_logs` 를 보나
 * `responses` 에는 **성공한 호출만** 남는다. 엔진이 100% 실패하면 그 엔진은
 * 그냥 조용해질 뿐이고, "요즘 조용하네" 와 "죽었다" 를 구분할 수 없다.
 * `llm_call_logs` 는 `status`('success'|'error')와 `error_msg` 를 남기므로
 * **실패하고 있다는 사실 자체**를 관측할 수 있다.
 *
 * ## 판정
 *   missing   — 기대 엔진인데 호출 기록이 아예 없음 (Perplexity 케이스)
 *   down      — 최근 성공이 STALE_HOURS 이전 · 또는 24h 성공 0 + 실패 다수 (Claude 케이스)
 *   degraded  — 24h 실패율이 임계 이상
 * 이상이 없으면 메일을 보내지 않는다(publish-watchdog 과 동일 정책).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.CITATION_ALERT_EMAIL ?? 'passion4050@gmail.com';
const STALE_HOURS = Number(process.env.MEASURE_WATCHDOG_STALE_HOURS ?? 30);
const FAIL_RATIO = Number(process.env.MEASURE_WATCHDOG_FAIL_RATIO ?? 0.5);
const MIN_CALLS = Number(process.env.MEASURE_WATCHDOG_MIN_CALLS ?? 10);

// 기대 엔진. 제품이 "4개 AI 검색엔진 측정" 이므로 4개가 기본값이다.
const EXPECTED = (process.env.MEASURE_WATCHDOG_ENGINES ?? 'gemini,openai,claude,perplexity')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ⚠ provider 표기가 통일돼 있지 않다 — llm_call_logs 에 'claude' 와 'anthropic' 이 둘 다 있다.
//   엔진 하나가 두 이름으로 쪼개지면 "조용하다" 로 오판하므로 별칭을 묶는다.
const PROVIDER_ALIASES: Record<string, string[]> = {
  claude: ['claude', 'anthropic'],
  gemini: ['gemini', 'google'],
  openai: ['openai', 'gpt'],
  perplexity: ['perplexity', 'pplx'],
};

type Verdict = 'ok' | 'missing' | 'down' | 'degraded';

interface EngineState {
  engine: string;
  verdict: Verdict;
  ok24h: number;
  err24h: number;
  lastSuccess: string | null;
  hoursSinceSuccess: number | null;
  latestError: string | null;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  ok: '정상',
  missing: '측정된 적 없음',
  down: '중단',
  degraded: '불안정',
};

function kstDateStr(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

async function sendAlertEmail(bad: EngineState[], all: EngineState[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };

  const fromAddr = process.env.RESEND_FROM ?? 'WECIRCLE GEO <reports@medimap.team>';
  const dateStr = kstDateStr();
  const subject = `[WECIRCLE] 🔴 측정 엔진 ${bad.length}개 이상 — ${bad.map((b) => b.engine).join(', ')} (${dateStr})`;

  const rows = all
    .map((e) => {
      const color = e.verdict === 'ok' ? '#059669' : e.verdict === 'degraded' ? '#B45309' : '#DC2626';
      const last = e.lastSuccess
        ? `${e.lastSuccess.slice(0, 16).replace('T', ' ')} (${e.hoursSinceSuccess ?? '?'}시간 전)`
        : '기록 없음';
      return `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">${e.engine}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-weight:800;color:${color}">${VERDICT_LABEL[e.verdict]}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;text-align:right;font-size:12px;color:#64748B">${e.ok24h} / ${e.err24h}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B">${last}</td>
    </tr>`;
    })
    .join('');

  const errBlocks = bad
    .filter((b) => b.latestError)
    .map(
      (b) => `
  <div style="margin:10px 0;padding:10px 12px;background:#FEF2F7;border-left:3px solid #DC2626;border-radius:4px">
    <b style="font-size:12px;color:#7F1D1D">${b.engine}</b>
    <div style="font-family:monospace;font-size:11px;color:#7F1D1D;margin-top:4px;word-break:break-all">${b.latestError}</div>
  </div>`,
    )
    .join('');

  const html = `
<div style="font-family:'Noto Sans KR',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0F172A">
  <div style="border-bottom:2px solid #DC2626;padding-bottom:12px;margin-bottom:8px">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#DC2626;text-transform:uppercase">WECIRCLE Measurement Watchdog</div>
    <h1 style="margin:6px 0 0;font-size:22px">측정 엔진 이상 감지</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#64748B">${dateStr} KST</p>
  </div>

  <p style="font-size:13px;line-height:1.7;color:#334155">
    엔진이 빠져도 배치는 <b>성공으로 끝납니다</b> — 남은 엔진으로 계속 돌기 때문입니다.
    그래서 워크플로 상태만 봐서는 알 수 없고, 그 사이 Mention Share 는 조용히
    한쪽으로 기울어집니다.
  </p>

  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:14px">
    <thead>
      <tr style="background:#F8FAFC">
        <th style="padding:8px;text-align:left;font-size:11px;color:#64748B">엔진</th>
        <th style="padding:8px;text-align:left;font-size:11px;color:#64748B">상태</th>
        <th style="padding:8px;text-align:right;font-size:11px;color:#64748B">24h 성공/실패</th>
        <th style="padding:8px;text-align:left;font-size:11px;color:#64748B">마지막 성공</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${errBlocks ? `<h2 style="margin:22px 0 4px;font-size:14px">최근 오류</h2>${errBlocks}` : ''}

  <p style="margin-top:22px;font-size:12px;color:#475569;line-height:1.7">
    <b>측정된 적 없음</b> → API 키 시크릿 미등록을 먼저 확인하세요.
    <code>_build_engines()</code> 는 키가 없으면 조용히 건너뜁니다.<br>
    <b>중단</b> → 크레딧 잔액·키 만료를 확인하세요. 배치 로그에는 <code>✓ 활성</code> 이
    찍혀도 호출은 전량 실패할 수 있습니다.
  </p>
  <p style="margin-top:14px;font-size:11px;color:#94A3B8;line-height:1.6">
    이 감시자는 Supabase pg_cron 이 호출합니다. 이상이 없으면 메일을 보내지 않습니다.
  </p>
</div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddr, to: ADMIN_EMAIL, subject, html }),
    });
    return { ok: res.ok, resend: await res.json() };
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

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent, error: rErr } = await sb
    .from('llm_call_logs')
    .select('provider, status')
    .gte('called_at', since);
  if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });

  const states: EngineState[] = [];
  for (const engine of EXPECTED) {
    const names = PROVIDER_ALIASES[engine] ?? [engine];
    const mine = (recent ?? []).filter((r) =>
      names.includes(String(r.provider ?? '').toLowerCase()),
    );
    const ok24h = mine.filter((r) => r.status === 'success').length;
    const err24h = mine.filter((r) => r.status === 'error').length;

    const { data: lastOk } = await sb
      .from('llm_call_logs')
      .select('called_at')
      .in('provider', names)
      .eq('status', 'success')
      .order('called_at', { ascending: false })
      .limit(1);
    const lastSuccess: string | null = lastOk?.[0]?.called_at ?? null;
    const hoursSinceSuccess = lastSuccess
      ? Math.floor((Date.now() - new Date(lastSuccess).getTime()) / 3_600_000)
      : null;

    const { data: lastErr } = await sb
      .from('llm_call_logs')
      .select('error_msg')
      .in('provider', names)
      .eq('status', 'error')
      .order('called_at', { ascending: false })
      .limit(1);
    const latestError: string | null = (lastErr?.[0]?.error_msg ?? null)?.slice(0, 200) ?? null;

    // 🔴 판정 순서가 중요하다. "호출 기록이 아예 없음"(missing) 과
    //    "호출은 하는데 전부 실패"(down) 는 원인도 조치도 다르다.
    //    전자는 시크릿 미등록, 후자는 크레딧·키 만료다.
    let verdict: Verdict = 'ok';
    if (lastSuccess === null && err24h === 0) {
      verdict = 'missing';
    } else if (hoursSinceSuccess === null || hoursSinceSuccess >= STALE_HOURS) {
      verdict = 'down';
    } else if (ok24h === 0 && err24h >= MIN_CALLS) {
      verdict = 'down';
    } else if (ok24h + err24h >= MIN_CALLS && err24h / (ok24h + err24h) >= FAIL_RATIO) {
      verdict = 'degraded';
    }

    states.push({ engine, verdict, ok24h, err24h, lastSuccess, hoursSinceSuccess, latestError });
  }

  const bad = states.filter((s) => s.verdict !== 'ok');
  const thresholds = { stale_hours: STALE_HOURS, fail_ratio: FAIL_RATIO, min_calls: MIN_CALLS };

  if (bad.length === 0) {
    return NextResponse.json({
      ok: true,
      alerted: false,
      reason: 'healthy',
      engines: states,
      thresholds,
    });
  }

  const email = await sendAlertEmail(bad, states);
  return NextResponse.json({
    ok: true,
    alerted: true,
    bad_count: bad.length,
    bad: bad.map((b) => ({ engine: b.engine, verdict: b.verdict, hours_since_success: b.hoursSinceSuccess })),
    engines: states,
    thresholds,
    email,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
