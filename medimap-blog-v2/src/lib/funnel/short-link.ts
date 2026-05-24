/**
 * ShortLink — UTM 자동 주입 + 클릭 추적 가능한 단축 URL.
 *
 * 흐름:
 *   1. 발행물(블로그/네이버/인스타) 끝에 https://medimap-geo.app/r/[slug] 부착
 *   2. 방문자 클릭 → /r/[slug] → visitor_id 쿠키 발급 → funnel_events.click 적재
 *      → destination_url로 302 리다이렉트
 *   3. destination_url에는 utm_* + visitor_id가 자동 주입됨
 *   4. 사이트 도착 → 문의 폼 제출 시 visitor_id로 attribution 결합
 */

import { nanoid } from 'nanoid';
import { getServerClient } from '../supabase';

export interface ShortLinkCreateInput {
  tenantId: string;
  destinationUrl: string;
  publicationId?: string;
  utmSource?: string;        // 'naver_blog' / 'instagram' / ...
  utmMedium?: string;        // 'social' / 'organic'
  utmCampaign?: string;      // 'lasek-april' 등
}

export interface ShortLinkRecord {
  id: string;
  slug: string;
  destinationUrl: string;
}

export async function createShortLink(input: ShortLinkCreateInput): Promise<ShortLinkRecord> {
  const slug = nanoid(8);
  const finalUrl = appendUtm(input.destinationUrl, {
    utm_source: input.utmSource,
    utm_medium: input.utmMedium,
    utm_campaign: input.utmCampaign
  });

  const client = getServerClient();
  if (!client) {
    // Supabase 미연결 환경 — in-memory mock 반환
    return { id: `mock-${slug}`, slug, destinationUrl: finalUrl };
  }

  const { data, error } = await client
    .from('short_links')
    .insert({
      tenant_id: input.tenantId,
      slug,
      destination_url: finalUrl,
      publication_id: input.publicationId,
      utm_source: input.utmSource,
      utm_medium: input.utmMedium,
      utm_campaign: input.utmCampaign
    })
    .select('id, slug, destination_url')
    .single();

  if (error) throw new Error(`short_link insert: ${error.message}`);
  return { id: data.id, slug: data.slug, destinationUrl: data.destination_url };
}

export function appendUtm(url: string, params: Record<string, string | undefined>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v) u.searchParams.set(k, v);
  }
  return u.toString();
}

export async function resolveAndTrack(slug: string, visitorId: string, referrer: string | null): Promise<string | null> {
  const client = getServerClient();
  if (!client) {
    return `https://example.com/?fallback=${slug}`;
  }
  const { data, error } = await client
    .from('short_links')
    .select('id, tenant_id, destination_url, publication_id')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;

  // 1) 카운터 증가
  await client.rpc('increment_click', { p_slug: slug }).then(
    () => undefined,
    async () => {
      // rpc 없으면 fallback — count read + update
      await client
        .from('short_links')
        .update({ click_count: ((data as any).click_count ?? 0) + 1 })
        .eq('id', data.id);
    }
  );

  // 2) funnel_event 기록
  await client.from('funnel_events').insert({
    tenant_id: data.tenant_id,
    kind: 'click',
    short_link_id: data.id,
    publication_id: data.publication_id,
    visitor_id: visitorId,
    meta: { referrer }
  });

  // 3) destination에 visitor_id 주입
  return appendUtm(data.destination_url, { mm_vid: visitorId });
}
