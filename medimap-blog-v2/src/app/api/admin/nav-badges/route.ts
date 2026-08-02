/**
 * Round 144 (2026-08-02) — 사이드바 처리 대기 배지.
 *
 * GET /api/admin/nav-badges → { ok, pendingContent, newLeads }
 *
 * 목적: 운영자가 어드민을 열자마자 "손댈 게 있는지"를 메뉴에서 바로 안다.
 * 기존엔 각 화면에 들어가야만 밀린 건수를 알 수 있어서, 결과적으로
 * "빨간 게 없으니 괜찮겠지"로 흘렀음(E2E 감사 지적).
 *
 * 실패해도 배지만 안 뜨면 되므로 전부 graceful — 절대 500 던지지 않음.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: true, pendingContent: 0, newLeads: 0 });

  let pendingContent = 0;
  let newLeads = 0;

  try {
    const { count } = await sb
      .from('generated_contents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft');
    pendingContent = count ?? 0;
  } catch {
    /* graceful */
  }

  try {
    // scanner_leads 에 확인/미확인 상태 컬럼이 없어(실측) "최근 7일 신규"를 배지로 쓴다.
    // 확인 상태 컬럼이 생기면 그때 미확인 건수로 교체할 것.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from('scanner_leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);
    newLeads = count ?? 0;
  } catch {
    /* graceful */
  }

  return NextResponse.json(
    { ok: true, pendingContent, newLeads },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
