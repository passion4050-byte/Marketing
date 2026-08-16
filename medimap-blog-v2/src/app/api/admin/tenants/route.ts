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
  'partner_slug', 'status', 'publish_count', 'monthly_cost', 'joined_at',
  'report_send_day', // Round 53 (2026-05-31) — 월간 보고서 발송일 (1~28)
  'publish_plan',    // Round 83 (2026-06-28) — A: 주3회(월/수/금), B: 매일
  // Round 162 (2026-08-16) — GBP 일치 영문 NAP (지도 축): 콘텐츠 NAP 카드·리뷰 퍼널에 사용
  'name_en', 'address_en', 'transit_en', 'gmaps_url', 'google_review_url',
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
  // Round 145 (2026-08-14) — 온보딩 갭 경고 (재발 방지).
  //   실사고: 해외 상품(tenant_products active)인데 해당 언어 키워드 0 → 생성이 구조적으로
  //   불가능한 채 침묵 (강남연세 en·밝은눈 en/zh·광동 en/zh 실측). enabled=false 도 동일 증상.
  //   목록에서 바로 보이게 tenant 별 warnings 배열로 반환.
  const warningsMap = new Map<number, string[]>();
  if (tenantIds.length > 0) {
    const [{ data: prodRows }, { data: kwRows }, { data: acsRows }] = await Promise.all([
      sb.from('tenant_products').select('tenant_id, market, lang')
        .eq('status', 'active').in('tenant_id', tenantIds),
      sb.from('keywords').select('tenant_id, market, lang')
        .eq('is_active', true).in('tenant_id', tenantIds),
      sb.from('auto_content_settings').select('tenant_id, enabled').in('tenant_id', tenantIds),
    ]);
    const kwCount = new Map<string, number>();
    (kwRows ?? []).forEach((k: { tenant_id: number; market: string | null; lang: string | null }) => {
      const key = `${k.tenant_id}|${k.market ?? 'domestic'}|${k.lang ?? 'ko'}`;
      kwCount.set(key, (kwCount.get(key) ?? 0) + 1);
    });
    const push = (tid: number, msg: string) => {
      const arr = warningsMap.get(tid) ?? [];
      if (!arr.includes(msg)) arr.push(msg);
      warningsMap.set(tid, arr);
    };
    (prodRows ?? []).forEach((p: { tenant_id: number; market: string; lang: string }) => {
      const n = kwCount.get(`${p.tenant_id}|${p.market}|${p.lang}`) ?? 0;
      if (n === 0) push(p.tenant_id, `${p.market === 'overseas' ? '해외' : '국내'} ${p.lang.toUpperCase()} 상품 활성인데 키워드 0`);
    });
    const acsEnabled = new Map<number, boolean>();
    (acsRows ?? []).forEach((a: { tenant_id: number; enabled: boolean }) => {
      acsEnabled.set(a.tenant_id, a.enabled);
    });
    (prodRows ?? []).forEach((p: { tenant_id: number }) => {
      if (acsEnabled.get(p.tenant_id) === false) push(p.tenant_id, '상품 활성인데 자동발행 꺼짐(enabled=false)');
    });
  }

  const enriched = tenants.map((t: { id: number }) => ({
    ...t,
    publish_count: publishCountMap.get(t.id) ?? 0,
    onboarding_warnings: warningsMap.get(t.id) ?? [],
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

  // Round 126 (2026-07-05) — partner_slug 자동 폴백.
  //   실사고: 신규 3개 병원이 partner_slug=NULL 로 등록돼 /with-partners URL 자체가
  //   없어 글이 발행돼도 영영 미노출 + 발행 태깅(파트너 판정)도 스킵됐음.
  //   등록 시 미입력이면 이름의 영문/숫자 + id 로 자동 생성 — 어드민에서 언제든
  //   보기 좋은 슬러그로 수정 가능 (URL 은 색인 초기라 변경 무해).
  if (!data.partner_slug && (body.business_model ?? '') !== 'self') {
    const base = name
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 24);
    const autoSlug = base ? `${base}-${data.id}` : `partner-${data.id}`;
    const { data: updated } = await sb
      .from('tenants')
      .update({ partner_slug: autoSlug })
      .eq('id', data.id)
      .select()
      .single();
    if (updated) Object.assign(data, updated);
  }

  // Round 34 phase 4 (2026-05-30) — 신규 등록 시 홈페이지 자동 분석.
  // homepage URL 이 있고 business_model 이 비어있거나 분류 문자열이면 자동 호출.
  // 백그라운드 — await 안 함 (response 빨리 반환).
  if (data.homepage && (!data.business_model || ['partner', 'self', '미지정', ''].includes(data.business_model))) {
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('host');
    if (host) {
      const analyzeUrl = `${proto}://${host}/api/admin/tenants/${data.id}/analyze-homepage?apply=true`;
      // fire-and-forget — 응답 기다리지 않음. 실패해도 tenant 생성 자체는 성공.
      // Round 81 — x-cron-secret 헤더로 미들웨어 통과 (쿠키 없는 서버↔서버 호출이라
      //   이전엔 401 로 자동 분석이 prod 에서 실행 안 됐음). CRON_SECRET 미설정 시 조용히 skip.
      if (process.env.CRON_SECRET) {
        fetch(analyzeUrl, {
          method: 'POST',
          headers: { 'x-cron-secret': process.env.CRON_SECRET },
        }).catch(() => {
          // graceful — 로그만 남기고 무시
        });
      }
    }
  }

  return NextResponse.json({ ok: true, tenant: data });
}
