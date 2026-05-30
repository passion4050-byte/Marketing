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
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_INSERT = new Set([
  'name', 'domain_category', 'region', 'business_model', 'address',
  'naver_place_url', 'phone', 'homepage', 'email',
  'partner_slug', 'status', 'publish_count', 'monthly_cost', 'joined_at'
]);

const NOT_NULL_PROTECT = new Set(['name', 'domain_category', 'region', 'business_model']);

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_INSERT.has(k)) continue;
    if (NOT_NULL_PROTECT.has(k) && (v === '' || v == null)) continue;
    out[k] = v === '' ? null : v;
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

  // Round 32 phase D (2026-05-30) — 각 tenant 의 published 글 카운트.
  // 옛 API 응답에는 publish_count 없어 페이지가 모두 0 표시.
  // fix 12 패턴: 별도 query → Map 으로 merge.
  const tenants = data ?? [];
  const tenantIds = tenants.map((t: { id: number }) => t.id);
  const publishCountMap = new Map<number, number>();
  if (tenantIds.length > 0) {
    const { data: pubRows } = await sb
      .from('generated_contents')
      .select('tenant_id')
      .eq('status', 'published')
      .in('tenant_id', tenantIds);
    (pubRows ?? []).forEach((r: { tenant_id: number }) => {
      publishCountMap.set(r.tenant_id, (publishCountMap.get(r.tenant_id) ?? 0) + 1);
    });
  }
  const enriched = tenants.map((t: { id: number }) => ({
    ...t,
    publish_count: publishCountMap.get(t.id) ?? 0,
  }));

  return NextResponse.json({ ok: true, tenants: enriched });
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
  await logAudit(req, sb, 'create_tenant', `tenants:${data.id}`, { diff: { after: data } });

  // Round 34 phase 4 (2026-05-30) — 신규 등록 시 홈페이지 자동 분석.
  // homepage URL 이 있고 business_model 이 비어있거나 분류 문자열이면 자동 호출.
  // 백그라운드 — await 안 함 (response 빨리 반환).
  if (data.homepage && (!data.business_model || ['partner', 'self', '미지정', ''].includes(data.business_model))) {
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('host');
    if (host) {
      const analyzeUrl = `${proto}://${host}/api/admin/tenants/${data.id}/analyze-homepage?apply=true`;
      // fire-and-forget — 응답 기다리지 않음. 실패해도 tenant 생성 자체는 성공.
      fetch(analyzeUrl, { method: 'POST' }).catch(() => {
        // graceful — 로그만 남기고 무시
      });
    }
  }

  return NextResponse.json({ ok: true, tenant: data });
}
