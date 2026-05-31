/**
 * /api/admin/keywords — Supabase keywords CRUD (server_role)
 *
 * prod keywords 스키마:
 *   id (int PK), tenant_id (int FK), text (varchar), category (varchar),
 *   target_brand (varchar — tenant 의 partner_slug 또는 brand alias),
 *   is_active (boolean)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['tenant_id', 'text', 'category', 'target_brand', 'is_active']);

function notConfigured() {
  return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
}

export async function GET() {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  // Round 42 D — purpose + is_saas_marketing 컬럼 추가 (own/competitor_landscape 구분)
  const { data, error } = await sb
    .from('keywords')
    .select(`id, tenant_id, text, category, target_brand, is_active, purpose, is_saas_marketing,
             tenants:tenant_id ( id, name, partner_slug, domain_category )`)
    .order('id', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  type Row = (NonNullable<typeof data>)[number];
  const items = (data ?? []).map((r: Row) => {
    const t = (r as unknown as {
      tenants: { id: number; name: string; partner_slug: string | null; domain_category: string | null } | null;
    }).tenants;
    const rowAny = r as unknown as { purpose?: string; is_saas_marketing?: boolean };
    return {
      id: r.id, tenant_id: r.tenant_id,
      tenant_name: t?.name ?? '(unknown)',
      partner_slug: t?.partner_slug ?? null,
      text: r.text, category: r.category,
      target_brand: r.target_brand, is_active: r.is_active,
      purpose: rowAny.purpose ?? 'own',
      is_saas_marketing: rowAny.is_saas_marketing ?? false,
    };
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const tenantId = body.tenant_id;
  if (!text) return NextResponse.json({ ok: false, error: 'text required' }, { status: 400 });
  if (tenantId == null) return NextResponse.json({ ok: false, error: 'tenant_id required' }, { status: 400 });

  const payload: Record<string, unknown> = { is_active: true };
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) payload[k] = v === '' ? null : v;
  }
  payload.text = text;
  payload.tenant_id = tenantId;

  const { data, error } = await sb.from('keywords').insert(payload).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'create_keyword', `keywords:${data.id}`, { diff: { after: data } });
  return NextResponse.json({ ok: true, keyword: data });
}
