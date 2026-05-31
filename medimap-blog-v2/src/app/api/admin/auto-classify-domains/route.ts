/**
 * Round 40 B3 (2026-05-31) — 도메인 자동 분류 일괄 등록 API.
 *
 * POST /api/admin/auto-classify-domains
 *   body: { domains: string[] }   // 분류할 도메인 목록 (선택적)
 *   - 비어있으면: 최근 7일 신규 도메인 자동 발견 → 분류
 *   - 매칭된 것만 domain_classifications 에 auto_suggested=true 로 INSERT
 *
 * 응답: { ok, added: [...], skipped: [...] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { autoClassifyDomain, bulkAutoClassify } from '@/lib/domain-auto-classifier';
import { invalidateClassifierCache } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { domains?: string[] };
  let candidateDomains: string[] = body.domains ?? [];

  // 비어있으면 최근 7일 신규 도메인 자동 추출
  if (candidateDomains.length === 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recent } = await sb
      .from('responses')
      .select('source_domains')
      .gte('created_at', sevenDaysAgo)
      .not('source_domains', 'is', null);
    const { data: prior } = await sb
      .from('responses')
      .select('source_domains')
      .gte('created_at', fortyDaysAgo)
      .lt('created_at', sevenDaysAgo)
      .not('source_domains', 'is', null);

    const priorSet = new Set<string>();
    (prior ?? []).forEach((r: { source_domains: Array<{ domain: string }> | null }) => {
      (r.source_domains ?? []).forEach((sd: { domain: string }) => {
        if (sd.domain) priorSet.add(sd.domain.toLowerCase());
      });
    });

    const recentSet = new Set<string>();
    (recent ?? []).forEach((r: { source_domains: Array<{ domain: string }> | null }) => {
      (r.source_domains ?? []).forEach((sd: { domain: string }) => {
        if (sd.domain && !priorSet.has(sd.domain.toLowerCase())) {
          recentSet.add(sd.domain.toLowerCase());
        }
      });
    });
    candidateDomains = Array.from(recentSet);
  }

  // 이미 등록된 도메인 제외
  const { data: existing } = await sb
    .from('domain_classifications')
    .select('domain')
    .in('domain', candidateDomains.map((d) => d.toLowerCase()));
  const existingSet = new Set<string>(
    (existing ?? []).map((r: { domain: string }) => r.domain.toLowerCase())
  );

  const toClassify = candidateDomains.filter((d) => !existingSet.has(d.toLowerCase()));
  const classifications = bulkAutoClassify(toClassify);

  const added: Array<{ domain: string; tier: string; category: string; confidence: number; reason: string }> = [];
  const skipped: Array<{ domain: string; reason: string }> = [];

  for (const { domain, classification } of classifications) {
    const { error } = await sb
      .from('domain_classifications')
      .insert({
        domain: domain.toLowerCase(),
        tier: classification.tier,
        category: classification.category,
        notes: `자동 발견 — ${classification.reason} (confidence ${classification.confidence})`,
        is_active: false, // 자동 분류는 비활성 — 운영자 검토 후 활성화
      });
    if (error) {
      skipped.push({ domain, reason: error.message });
    } else {
      added.push({
        domain,
        tier: classification.tier,
        category: classification.category,
        confidence: classification.confidence,
        reason: classification.reason,
      });
    }
  }

  // domain_classifications.is_active 가 false 라 cache 무효화 불필요. 그래도 호출 (운영자가 활성화 직후 반영)
  invalidateClassifierCache();

  // 매칭 안 된 도메인 — skipped 에 추가
  const matchedSet = new Set(classifications.map((c) => c.domain));
  for (const d of toClassify) {
    if (!matchedSet.has(d)) {
      const c = autoClassifyDomain(d);
      skipped.push({
        domain: d,
        reason: c
          ? `T5 default (${c.category}) — 명시 분류 불필요`
          : '매칭 규칙 없음',
      });
    }
  }

  // 이미 등록된 도메인도 skipped
  for (const d of candidateDomains) {
    if (existingSet.has(d.toLowerCase())) {
      skipped.push({ domain: d, reason: '이미 분류 등록됨' });
    }
  }

  return NextResponse.json({
    ok: true,
    total_candidates: candidateDomains.length,
    added,
    skipped,
    note: '자동 분류된 도메인은 is_active=false. /admin/domain-classifications 에서 검토 후 활성화 필요.',
  });
}
