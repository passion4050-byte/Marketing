/**
 * Round 38 후속 (2026-05-31) — 도메인 분류 사전의 클라이언트별 컨텍스트 API.
 *
 * GET /api/admin/domain-context?tenantId=N
 *   응답: {
 *     tenants: [...],            // selector 용
 *     selected_tenant: {...},
 *     domain_map: {
 *       'sueye.co.kr': {
 *         occurrences: 6,        // 그 tenant 키워드로 측정 시 인용된 횟수
 *         label: 'DIRECT',       // 라벨 (NULL 가능)
 *         priority: 5,
 *         notes: '...'
 *       }
 *     }
 *   }
 *
 * 도메인 분류 사전 페이지가 글로벌 tier 외에 클라이언트별 의미를 표시.
 *
 * POST /api/admin/domain-context?tenantId=N
 *   body: { domain, label, priority?, notes? }
 *   동작: tenant_domain_competition UPSERT
 *
 * DELETE /api/admin/domain-context?tenantId=N&domain=...
 *   동작: 라벨 제거
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_LABELS = ['DIRECT', 'INDIRECT', 'REFERENCE', 'TO_LEARN', 'IGNORE'] as const;
type AllowedLabel = (typeof ALLOWED_LABELS)[number];

function isValidLabel(v: unknown): v is AllowedLabel {
  return typeof v === 'string' && (ALLOWED_LABELS as readonly string[]).includes(v);
}

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const tenantId = Number(new URL(req.url).searchParams.get('tenantId'));

  // 1. tenants list (selector)
  const { data: tenantsList } = await sb
    .from('tenants')
    .select('id, name, business_model')
    .order('id');

  if (!tenantId) {
    return NextResponse.json({
      ok: true,
      tenants: tenantsList ?? [],
      selected_tenant: null,
      domain_map: {},
    });
  }

  const selected = (tenantsList ?? []).find((t: { id: number }) => t.id === tenantId);

  // 2. 그 tenant 의 keywords (own + competitor_landscape) 의 측정 결과
  const { data: kws } = await sb
    .from('keywords')
    .select('id')
    .eq('tenant_id', tenantId);
  const kwIds = (kws ?? []).map((k: { id: number }) => k.id);

  const occurrences = new Map<string, number>();
  if (kwIds.length > 0) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: queries } = await sb
      .from('queries')
      .select('id')
      .in('keyword_id', kwIds)
      .neq('engine', 'stub')
      .gte('requested_at', cutoff);
    const queryIds = (queries ?? []).map((q: { id: number }) => q.id);
    if (queryIds.length > 0) {
      const { data: resps } = await sb
        .from('responses')
        .select('source_domains')
        .in('query_id', queryIds)
        .not('source_domains', 'is', null);
      (resps ?? []).forEach(
        (r: { source_domains: Array<{ domain: string }> | null }) => {
          (r.source_domains ?? []).forEach((sd: { domain: string }) => {
            if (sd.domain) {
              const d = sd.domain.toLowerCase();
              occurrences.set(d, (occurrences.get(d) ?? 0) + 1);
            }
          });
        }
      );
    }
  }

  // 3. 라벨 fetch
  const { data: labels } = await sb
    .from('tenant_domain_competition')
    .select('domain, label, priority, notes, auto_suggested')
    .eq('tenant_id', tenantId);
  const labelMap = new Map<
    string,
    { label: string; priority: number; notes: string | null; auto_suggested: boolean }
  >();
  (labels ?? []).forEach(
    (r: { domain: string; label: string; priority: number; notes: string | null; auto_suggested: boolean }) => {
      labelMap.set(r.domain.toLowerCase(), {
        label: r.label,
        priority: r.priority,
        notes: r.notes,
        auto_suggested: r.auto_suggested,
      });
    }
  );

  // 4. domain_map — occurrences ∪ labels 통합
  const domainSet = new Set<string>([...occurrences.keys(), ...labelMap.keys()]);
  const domainMap: Record<
    string,
    { occurrences: number; label: string | null; priority: number; notes: string | null; auto_suggested: boolean }
  > = {};
  domainSet.forEach((d) => {
    const lbl = labelMap.get(d);
    domainMap[d] = {
      occurrences: occurrences.get(d) ?? 0,
      label: lbl?.label ?? null,
      priority: lbl?.priority ?? 0,
      notes: lbl?.notes ?? null,
      auto_suggested: lbl?.auto_suggested ?? false,
    };
  });

  return NextResponse.json({
    ok: true,
    tenants: tenantsList ?? [],
    selected_tenant: selected ?? null,
    domain_map: domainMap,
    counts_by_label: {
      DIRECT: Array.from(labelMap.values()).filter((l) => l.label === 'DIRECT').length,
      INDIRECT: Array.from(labelMap.values()).filter((l) => l.label === 'INDIRECT').length,
      REFERENCE: Array.from(labelMap.values()).filter((l) => l.label === 'REFERENCE').length,
      TO_LEARN: Array.from(labelMap.values()).filter((l) => l.label === 'TO_LEARN').length,
      IGNORE: Array.from(labelMap.values()).filter((l) => l.label === 'IGNORE').length,
    },
  });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const tenantId = Number(new URL(req.url).searchParams.get('tenantId'));
  if (!tenantId) return NextResponse.json({ ok: false, error: 'tenantId required' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    domain?: string;
    label?: string;
    priority?: number;
    notes?: string;
  };
  const domain = body.domain?.trim().toLowerCase();
  if (!domain) return NextResponse.json({ ok: false, error: 'domain required' }, { status: 400 });
  if (!isValidLabel(body.label)) {
    return NextResponse.json(
      { ok: false, error: `label must be one of ${ALLOWED_LABELS.join(', ')}` },
      { status: 400 }
    );
  }

  const { error } = await sb
    .from('tenant_domain_competition')
    .upsert(
      {
        tenant_id: tenantId,
        domain,
        label: body.label,
        priority: typeof body.priority === 'number' ? body.priority : 0,
        notes: body.notes ?? null,
        auto_suggested: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,domain' }
    );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tenantId, domain });
}

export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const tenantId = Number(url.searchParams.get('tenantId'));
  const domain = url.searchParams.get('domain')?.trim().toLowerCase();
  if (!tenantId || !domain) {
    return NextResponse.json({ ok: false, error: 'tenantId + domain required' }, { status: 400 });
  }

  const { error } = await sb
    .from('tenant_domain_competition')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('domain', domain);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tenantId, domain, deleted: true });
}
