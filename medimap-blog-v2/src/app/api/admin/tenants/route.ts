/**
 * /api/admin/tenants — Supabase tenants 테이블 CRUD (server_role)
 *
 * prod tenants 스키마 (실 컬럼):
 *   id (int PK), name (varchar), domain_category (varchar), region (varchar),
 *   business_model (text), address (varchar), naver_place_url (varchar),
 *   phone (varchar), homepage (varchar), password_hash (varchar),
 *   created_at (timestamptz), password_set_at (timestamptz),
 *   partner_slug (text), status (text), publish_count (int),
 *   monthly_cost (numeric), joined_at (date)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_INSERT = new Set([
  'name', 'domain_category', 'region', 'business_model', 'address',
  'naver_place_url', 'phone', 'homepage', 'email',
  'partner_slug', 'status', 'publish_count', 'monthly_cost', 'joined_at'
]);

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_INSERT.has(k)) out[k] = v === '' ? null : v;
  }
  return out;
}

function notConfigured() {
  return NextResponse.json(
    { ok: false, error: 'supabase not configured' },
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
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tenants: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const payload: Record<string, unknown> = {
    ...pickAllowed(body),
    name,
    // NOT NULL 보호 — DB default 없는 컬럼들
    domain_category: body.domain_category ?? '기타',
    region: body.region ?? '미지정',
    business_model: body.business_model ?? '미지정',
    status: body.status ?? 'trial',
    joined_at: body.joined_at ?? new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
    password_hash: 'placeholder-reset-required'
  };

  const { data, error } = await sb.from('tenants').insert(payload).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tenant: data });
}
