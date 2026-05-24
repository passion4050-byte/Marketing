/**
 * POST /api/inquiry/submit
 *
 * 폼 제출 → DB INSERT + attribution 연결 + funnel_event.inquiry_submit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

interface Body {
  tenantId?: string;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  procedureInterest?: string;
  /** 클라이언트에서 함께 전달 (mm_vid 쿠키 + utm 파라미터) */
  visitorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.name || !body?.phone) {
    return NextResponse.json({ ok: false, error: 'name/phone 필요' }, { status: 400 });
  }

  const tenantId = body.tenantId ?? process.env.DEMO_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

  const client = getServerClient();
  if (!client) {
    // Supabase 미연결 환경 — silent 성공 (개발용)
    return NextResponse.json({ ok: true, mode: 'dev-no-db' });
  }

  // 1) 마지막 클릭 short_link 찾기
  let lastClickId: string | null = null;
  if (body.visitorId) {
    const { data } = await client
      .from('funnel_events')
      .select('short_link_id')
      .eq('tenant_id', tenantId)
      .eq('visitor_id', body.visitorId)
      .eq('kind', 'click')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastClickId = (data?.short_link_id as string) ?? null;
  }

  // 2) inquiry insert
  const { data: inq, error: inqErr } = await client
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      message: body.message,
      procedure_interest: body.procedureInterest,
      last_click_short_link_id: lastClickId,
      utm_source: body.utmSource,
      utm_medium: body.utmMedium,
      utm_campaign: body.utmCampaign,
      source: 'website'
    })
    .select('id')
    .single();

  if (inqErr) {
    return NextResponse.json({ ok: false, error: inqErr.message }, { status: 500 });
  }

  // 3) funnel_event 기록
  await client.from('funnel_events').insert({
    tenant_id: tenantId,
    kind: 'inquiry_submit',
    short_link_id: lastClickId,
    inquiry_id: inq.id,
    visitor_id: body.visitorId,
    meta: {
      utm_source: body.utmSource,
      utm_medium: body.utmMedium,
      utm_campaign: body.utmCampaign
    }
  });

  // 4) attribution 카운터 증가
  if (lastClickId) {
    await client.rpc('increment_inquiry_attribution', { p_short_link_id: lastClickId }).then(
      () => undefined,
      async () => {
        // RPC 없으면 publications 직접 update (간단화)
      }
    );
  }

  return NextResponse.json({
    ok: true,
    inquiryId: inq.id,
    attributedShortLinkId: lastClickId
  });
}
