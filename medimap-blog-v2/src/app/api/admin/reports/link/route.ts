/**
 * Round 144 (2026-08-02) — 클라이언트 공개 보고서 링크 발급.
 *
 * GET /api/admin/reports/link?tenantId=4&period=2026-08
 *   → { ok, url }  (middleware 의 admin 쿠키 가드 뒤에 있음 — 운영자만 발급 가능)
 *
 * 토큰은 서버 시크릿으로 HMAC 서명하므로 클라이언트 컴포넌트에서 직접 만들 수 없어
 * 이 엔드포인트를 경유한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildReportUrl, isValidPeriod } from '@/lib/reportToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tenantId = Number(sp.get('tenantId'));
  const now = new Date();
  const period =
    sp.get('period') ||
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  if (!Number.isFinite(tenantId) || tenantId <= 0) {
    return NextResponse.json({ ok: false, error: 'tenantId 필요' }, { status: 400 });
  }
  if (!isValidPeriod(period)) {
    return NextResponse.json({ ok: false, error: 'period 형식 오류 (yyyy-MM)' }, { status: 400 });
  }

  const url = buildReportUrl(req.nextUrl.origin, tenantId, period);
  if (!url) {
    return NextResponse.json(
      { ok: false, error: 'REPORT_TOKEN_SECRET(또는 ADMIN_SESSION_SECRET) 미설정' },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, url, period }, { headers: { 'Cache-Control': 'no-store' } });
}
