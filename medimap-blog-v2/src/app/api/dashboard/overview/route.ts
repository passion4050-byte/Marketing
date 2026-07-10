/**
 * GET /api/dashboard/overview?tenant=4
 *
 * 클라이언트 콘솔 홈 — 진짜 AI 인용 현황 대시보드 데이터.
 * mentions/responses/queries/keywords 실측을 Postgres RPC(dashboard_overview)로 집계.
 * openai→chatgpt 매핑, stub 엔진(데모) 제외. 경쟁사 SOV는 측정 파서 보강 후(경로 2) 추가.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('tenant');
  const tenant = Number(raw ?? '4') || 4;

  const client = getServerClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await client.rpc('dashboard_overview', { p_tenant: tenant });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tenant, data });
}
