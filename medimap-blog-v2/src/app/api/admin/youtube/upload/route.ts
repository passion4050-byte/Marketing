/**
 * POST /api/admin/youtube/upload
 *
 * multipart/form-data: { video: File, title, description, tags, tenantId, scriptId? }
 *
 * 운영 환경:
 *  1. tenant_integrations 에서 tenantId 의 access_token / refresh_token 조회
 *  2. access_token 만료 시 refresh_token 으로 갱신
 *  3. YouTube Data API videos.insert 호출 (resumable upload 권장)
 *  4. 결과 (videoId, url) 을 publications 테이블에 기록
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel free tier max

interface UploadResult {
  ok: boolean;
  videoId?: string;
  url?: string;
  stub?: boolean;
  error?: string;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.access_token as string) ?? null;
}

export async function POST(req: NextRequest): Promise<NextResponse<UploadResult>> {
  // env 가드
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN_DEMO; // 운영: Supabase 에서 tenant 별 조회
  if (!clientId) {
    return NextResponse.json({ ok: false, stub: true, error: 'YOUTUBE_CLIENT_ID not set' });
  }
  if (!refreshToken) {
    return NextResponse.json({
      ok: false,
      stub: true,
      error: 'No tenant token. Connect YouTube at /admin/integrations first.'
    });
  }

  let title = '제목 없음';
  let description = '';
  let videoBuffer: ArrayBuffer | null = null;
  try {
    const form = await req.formData();
    title = (form.get('title') as string) ?? title;
    description = (form.get('description') as string) ?? '';
    const file = form.get('video') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'video file required' }, { status: 400 });
    videoBuffer = await file.arrayBuffer();
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'invalid form data' }, { status: 400 });
  }

  // Refresh access token
  const accessToken = await refreshAccessToken(refreshToken);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'token refresh failed' }, { status: 500 });
  }

  // YouTube resumable upload — Step 1: initiate
  const metadata = {
    snippet: {
      title,
      description,
      categoryId: '22', // People & Blogs
      tags: ['MEDIMAP', '의료', '병원']
    },
    status: {
      privacyStatus: 'unlisted', // 안전 기본값. 운영팀 검수 후 public 전환
      selfDeclaredMadeForKids: false
    }
  };
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/*'
    },
    body: JSON.stringify(metadata)
  });
  if (!initRes.ok) {
    const errText = await initRes.text();
    return NextResponse.json({ ok: false, error: `init failed: ${errText}` }, { status: 500 });
  }
  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    return NextResponse.json({ ok: false, error: 'no upload URL' }, { status: 500 });
  }

  // Step 2: upload bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/*' },
    body: videoBuffer
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return NextResponse.json({ ok: false, error: `upload failed: ${errText}` }, { status: 500 });
  }
  const result = await uploadRes.json();
  return NextResponse.json({
    ok: true,
    videoId: result.id,
    url: `https://www.youtube.com/watch?v=${result.id}`
  });
}
