/**
 * GET /r/[slug] — ShortLink 리디렉트 + 클릭 이벤트 기록.
 *
 * 1st-party 쿠키 mm_vid (visitor_id) 발급 — 6개월 만료.
 * 동일 visitor가 여러 슬러그를 거쳐도 같은 ID로 attribution 연결됨.
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { resolveAndTrack } from '@/lib/funnel/short-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'mm_vid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;        // 6개월

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  if (!slug) {
    return NextResponse.redirect(new URL('/', req.url), 302);
  }

  // visitor_id 확보 (없으면 발급)
  let visitorId = req.cookies.get(COOKIE_NAME)?.value;
  const isNewVisitor = !visitorId;
  if (!visitorId) visitorId = nanoid(16);

  const referrer = req.headers.get('referer');
  const destination = await resolveAndTrack(slug, visitorId, referrer);

  const target = destination ?? new URL('/', req.url).toString();
  const res = NextResponse.redirect(target, 302);

  if (isNewVisitor) {
    res.cookies.set(COOKIE_NAME, visitorId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,        // 클라이언트도 읽을 수 있어야 폼에서 함께 전송 가능
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  return res;
}
