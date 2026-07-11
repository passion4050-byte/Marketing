/**
 * GET  /api/admin/tenant-products?tenant=<id>   → 상품 목록 (tenant 지정 시 필터)
 * POST /api/admin/tenant-products               → 상품 신청(생성)
 *
 * tenant_products = 테넌트×market×lang 상품(서비스) 단일 진실원(SoT).
 * 상품 하나 = (국내 ko) 또는 (해외 en/ja/zh-Hant) 언어별 신청 단위.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_MARKET = new Set(['domestic', 'overseas']);
const VALID_LANG = new Set(['ko', 'en', 'ja', 'zh-Hant', 'zh-Hans']);
const VALID_STATUS = new Set(['active', 'paused', 'churned']);

function notConfigured() {
  return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
}

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const tenant = new URL(req.url).searchParams.get('tenant');
  let q = sb.from('tenant_products').select('*').order('market').order('lang');
  if (tenant) q = q.eq('tenant_id', Number(tenant));
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(
    { ok: true, products: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tenant_id = Number(b.tenant_id);
  const market = String(b.market ?? '');
  const lang = String(b.lang ?? '');
  if (!tenant_id || !VALID_MARKET.has(market) || !VALID_LANG.has(lang)) {
    return NextResponse.json(
      { ok: false, error: 'tenant_id · market(domestic|overseas) · lang 필수/유효값' },
      { status: 400 },
    );
  }
  // 국내=ko, 해외=en/ja/zh 조합 가드
  if ((market === 'domestic') !== (lang === 'ko')) {
    return NextResponse.json(
      { ok: false, error: '국내 상품은 lang=ko, 해외 상품은 en/ja/zh-* 여야 합니다' },
      { status: 400 },
    );
  }
  const status = VALID_STATUS.has(String(b.status)) ? String(b.status) : 'active';
  const payload = {
    tenant_id,
    market,
    lang,
    status,
    plan: b.plan ? String(b.plan) : null,
    monthly_cost:
      b.monthly_cost != null && b.monthly_cost !== '' ? Number(b.monthly_cost) : null,
  };
  const { data, error } = await sb
    .from('tenant_products')
    .insert(payload)
    .select()
    .maybeSingle();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { ok: false, error: '이미 등록된 상품(같은 시장·언어)입니다' },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  await logAudit(req, sb, 'create_tenant_product', `tenant_products:${data?.id}`, {
    diff: payload,
  });
  return NextResponse.json({ ok: true, product: data });
}
