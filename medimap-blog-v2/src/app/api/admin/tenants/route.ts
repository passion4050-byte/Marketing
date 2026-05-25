/**
 * /api/admin/tenants — Supabase tenants 테이블 CRUD (server_role).
 *
 * GET  → 전체 목록 (관리자 UI 에서 fetch)
 * POST → 신규 클라이언트 생성
 *
 * 모든 호출은 middleware 에서 admin cookie 검증을 거친 뒤 도달한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TenantRow {
  id: number | string;
  name: string;
  domain: string | null;
  category: string | null;
  region: string | null;
  contact: string | null;
  status: 'active' | 'paused' | 'trial' | null;
  partner_slug: string | null;
  publish_count: number | null;
  monthly_cost: number | null;
  joined_at: string | null;
  created_at?: string;
}

function notConfigured() {
  return NextResponse.json(
    { ok: false, error: 'supabase not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' },
    { status: 503 }
  );
}

export async function GET() {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { data, error } = await sb
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tenants: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Partial<TenantRow>;
  const name = (body.name ?? '').toString().trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });
  }
  const payload = {
    name,
    domain: body.domain?.toString().trim() || null,
    category: body.category?.toString().trim() || null,
    region: body.region?.toString().trim() || null,
    contact: body.contact?.toString().trim() || null,
    status: body.status ?? 'trial',
    partner_slug: body.partner_slug?.toString().trim() || null,
    publish_count: body.publish_count ?? 0,
    monthly_cost: body.monthly_cost ?? 0,
    joined_at: body.joined_at ?? new Date().toISOString().slice(0, 10)
  };
  const { data, error } = await sb.from('tenants').insert(payload).select().single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tenant: data });
}
