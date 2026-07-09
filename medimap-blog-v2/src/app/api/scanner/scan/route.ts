/**
 * POST /api/scanner/scan
 *
 * 무료 GEO Scanner — 공개 진단.
 *   body: { url: string, email?: string, utmSource?, utmMedium?, utmCampaign? }
 *   → scanTarget 실행 → scanner_leads 저장(best-effort) → 리포트 JSON 반환.
 *
 * 리포트는 페이지에 즉시 렌더된다(이메일 발송은 도메인 verify 후 별도 — 현재는 리드 캡처만).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { scanTarget } from '@/lib/scanner/scan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  url?: string;
  email?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// 아주 단순한 rate 방어 — 동일 IP 짧은 시간 다량 방지용 메모리 버킷.
const bucket = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const win = 60_000;
  const arr = (bucket.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  bucket.set(ip, arr);
  return arr.length > 8;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const url = (body?.url || '').trim();
  if (!url) {
    return NextResponse.json({ ok: false, error: 'url 이 필요합니다.' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
  }

  const report = await scanTarget(url);

  // 리드 저장 — best-effort (DB 미연결/테이블 부재여도 리포트는 반환)
  try {
    const client = getServerClient();
    if (client && report.ok) {
      await client.from('scanner_leads').insert({
        url: report.url,
        domain: report.domain,
        email: body?.email || null,
        overall_score: report.overallScore,
        scores: report.items.map((i) => ({ key: i.key, score: i.score })),
        compliance_status: report.compliance.status,
        compliance_violations: report.compliance.topViolations,
        utm_source: body?.utmSource || null,
        utm_medium: body?.utmMedium || null,
        utm_campaign: body?.utmCampaign || null,
        user_agent: req.headers.get('user-agent') || null,
        source: 'scanner'
      });
    }
  } catch {
    // 저장 실패는 무시 — 사용자 경험 우선
  }

  const httpStatus = report.ok ? 200 : 422;
  return NextResponse.json({ ok: report.ok, report }, { status: httpStatus });
}
