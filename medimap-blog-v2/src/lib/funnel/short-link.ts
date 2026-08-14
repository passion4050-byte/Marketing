/**
 * ShortLink — UTM 자동 주입 + 클릭 추적 가능한 단축 URL.
 *
 * Round 145 (2026-08-13) — 🔴 실제 DB 스키마로 정합 (144c에서 발견된 깨진 상태 수정).
 *   기존 코드는 존재하지 않는 테이블을 참조했음:
 *     short_links → 실제는 shortlinks (target_url, is_active, click_count)
 *     destination_url → target_url
 *     funnel_events → shortlink_clicks (shortlink_id, tenant_id, clicked_at, referer)
 *   정상 구현(medimap-blog 의 lookupShortlink/recordClick)과 동일 테이블·컬럼 사용.
 *
 * 흐름:
 *   1. 발행물 끝에 /r/[slug] 부착 (정본 서빙은 medimap-blog 쪽 — wecircle.co.kr/r/{slug})
 *   2. 방문자 클릭 → shortlink_clicks INSERT + shortlinks.click_count 증가
 *      → target_url 로 302 리다이렉트
 */

import { nanoid } from 'nanoid';
import { getServerClient } from '../supabase';

export interface ShortLinkCreateInput {
  tenantId: number;
  targetUrl: string;
  slug?: string;             // 미지정 시 nanoid(8). 클라이언트 추적링크는 k-{partner_slug} 규칙 권장
  label?: string;
  utmSource?: string;        // 'wecircle_blog' / 'naver_blog' / ...
  utmMedium?: string;        // 'ai_cite' / 'social' / ...
  utmCampaign?: string;
}

export interface ShortLinkRecord {
  id: number | string;
  slug: string;
  targetUrl: string;
}

export async function createShortLink(input: ShortLinkCreateInput): Promise<ShortLinkRecord> {
  const slug = input.slug ?? nanoid(8);
  const finalUrl = appendUtm(input.targetUrl, {
    utm_source: input.utmSource,
    utm_medium: input.utmMedium,
    utm_campaign: input.utmCampaign,
  });

  const client = getServerClient();
  if (!client) {
    // Supabase 미연결 환경 — in-memory mock 반환
    return { id: `mock-${slug}`, slug, targetUrl: finalUrl };
  }

  // ⚠️ shortlinks 는 is_active/click_count/created_at/updated_at 에 DB default 없음 → 전부 명시 (Round 144c)
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('shortlinks')
    .insert({
      tenant_id: input.tenantId,
      slug,
      target_url: finalUrl,
      label: input.label ?? null,
      is_active: true,
      click_count: 0,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id, slug, target_url')
    .single();

  if (error) throw new Error(`shortlinks insert: ${error.message}`);
  return { id: data.id, slug: data.slug, targetUrl: data.target_url };
}

export function appendUtm(url: string, params: Record<string, string | undefined>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v);
  }
  return u.toString();
}

export async function resolveAndTrack(
  slug: string,
  visitorId: string,
  referrer: string | null
): Promise<string | null> {
  const client = getServerClient();
  if (!client) {
    return null;
  }
  const { data, error } = await client
    .from('shortlinks')
    .select('id, tenant_id, target_url, click_count, is_active')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data || data.is_active === false) return null;

  // 1) 클릭 기록 (정본 이벤트 테이블)
  await client.from('shortlink_clicks').insert({
    shortlink_id: data.id,
    tenant_id: data.tenant_id,
    clicked_at: new Date().toISOString(),
    referer: referrer ?? null,
  });

  // 2) 카운터 증가 (베스트에포트 — 실패해도 리다이렉트는 진행)
  await client
    .from('shortlinks')
    .update({
      click_count: (data.click_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(
      () => undefined,
      () => undefined
    );

  // 3) target 에 visitor_id 주입
  return appendUtm(data.target_url, { mm_vid: visitorId });
}
