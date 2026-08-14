/**
 * POST /api/short-link — ShortLink 생성 API.
 *
 * Round 145 (2026-08-13) — 실제 DB 스키마(shortlinks: tenant_id int, target_url) 정합.
 * Body: { tenantId?, targetUrl, slug?, label?, utmSource?, utmMedium?, utmCampaign? }
 *   (구 destinationUrl 도 하위호환으로 수용)
 * Response: { slug, url, targetUrl }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createShortLink } from '@/lib/funnel/short-link';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'nodejs';

interface Body {
  tenantId?: number | string;
  targetUrl?: string;
  destinationUrl?: string; // 하위호환
  slug?: string;
  label?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const targetUrl = body?.targetUrl ?? body?.destinationUrl;
  if (!targetUrl) {
    return NextResponse.json({ ok: false, error: 'targetUrl 필요' }, { status: 400 });
  }
  try {
    const tenantId = Number(body?.tenantId ?? process.env.DEMO_TENANT_ID ?? 12);
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ ok: false, error: 'tenantId 는 숫자여야 합니다' }, { status: 400 });
    }
    const rec = await createShortLink({
      tenantId,
      targetUrl,
      slug: body?.slug,
      label: body?.label,
      utmSource: body?.utmSource,
      utmMedium: body?.utmMedium,
      utmCampaign: body?.utmCampaign,
    });
    return NextResponse.json({
      ok: true,
      slug: rec.slug,
      url: `${siteConfig.url}/r/${rec.slug}`,
      targetUrl: rec.targetUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
