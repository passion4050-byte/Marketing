/**
 * GET /api/admin/scanner-leads
 *
 * 무료 GEO Scanner 리드 목록 — 어드민 전용(middleware ADMIN cookie 가드).
 * scanner_leads 최신순. 상담 폼 제출(lead_captured=true) + 익명 스캔 모두 포함.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const client = getServerClient();
  if (!client) return NextResponse.json({ ok: true, leads: [] });

  const { data, error } = await client
    .from('scanner_leads')
    .select('id, created_at, name, org, email, phone, url, domain, overall_score, compliance_status, message, lead_captured, source')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, leads: data ?? [] });
}
