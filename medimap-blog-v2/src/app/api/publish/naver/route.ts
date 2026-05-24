/**
 * POST /api/publish/naver
 *
 * Body: { strategy: 'manual'|'email'|'playwright', payload: {...}, emailTo?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { publishToNaver, type NaverPublishStrategy, type NaverPublishPayload } from '@/lib/publish/naver';

export const runtime = 'nodejs';

interface Body {
  strategy?: NaverPublishStrategy;
  payload: NaverPublishPayload;
  emailTo?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.payload?.title || !body?.payload?.body) {
    return NextResponse.json({ ok: false, error: 'payload.title/body 필요' }, { status: 400 });
  }
  const strategy: NaverPublishStrategy = body.strategy ?? 'manual';
  const result = await publishToNaver(strategy, body.payload, { emailTo: body.emailTo });
  return NextResponse.json({ ok: result.status !== 'failed', result });
}
