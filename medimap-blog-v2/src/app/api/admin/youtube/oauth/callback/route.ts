import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  if (error) {
    return NextResponse.redirect(`${req.nextUrl.origin}/admin/integrations?yt_error=${error}`);
  }
  if (!code) {
    return NextResponse.redirect(`${req.nextUrl.origin}/admin/integrations?yt_error=no_code`);
  }
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ ok: false, error: 'YOUTUBE credentials not set' }, { status: 500 });
  }
  const redirectUri = `${req.nextUrl.origin}/api/admin/youtube/oauth/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return NextResponse.json({ ok: false, error: 'token_exchange_failed', detail: txt }, { status: 500 });
  }
  const tokens = await tokenRes.json();
  // TODO: 운영 단계에서 tokens.refresh_token + tokens.access_token 을 Supabase tenant_integrations 테이블에 암호화 저장
  // 현재는 redirect with success flag
  return NextResponse.redirect(`${req.nextUrl.origin}/admin/integrations?yt_ok=1`);
}
