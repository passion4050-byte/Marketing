import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const YT_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

export async function GET(req: NextRequest) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: 'YOUTUBE_CLIENT_ID not configured. See /admin/integrations docs.' },
      { status: 500 }
    );
  }
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/admin/youtube/oauth/callback`;
  const state = `medimap_${Date.now()}`;
  const url = `${YT_AUTH}?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  }).toString();
  return NextResponse.redirect(url);
}
