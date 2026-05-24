/**
 * POST /api/short-link — ShortLink 생성 API.
 *
 * Body: { destinationUrl, publicationId?, utmSource?, utmMedium?, utmCampaign? }
 * Response: { slug, url, destinationUrl }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createShortLink } from '@/lib/funnel/short-link';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'nodejs';

interface Body {
  tenantId?: string;
  destinationUrl: string;
  publicationId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.destinationUrl) {
    return NextResponse.json({ ok: false, error: 'destinationUrl 필요' }, { status: 400 });
  }
  try {
    const tenantId = body.tenantId ?? process.env.DEMO_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
    const rec = await createShortLink({
      tenantId,
      destinationUrl: body.destinationUrl,
      publicationId: body.publicationId,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign
    });
    return NextResponse.json({
      ok: true,
      slug: rec.slug,
      url: `${siteConfig.url}/r/${rec.slug}`,
      destinationUrl: rec.destinationUrl
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
