/**
 * Round 29 fix 11 (2026-05-30) — 임시 진단 endpoint
 *
 * 어드민 검수 탭이 0건 표시되는 미스터리 진단:
 * 1. SUPABASE_SERVICE_ROLE_KEY 가 deploy 에 실제로 박혔는지
 * 2. JWT payload 의 role 이 'service_role' 인지 ('anon' 잘못 등록 케이스 검증)
 * 3. 실제 query 호출 결과 + 에러
 *
 * ⚠️ 보안: 임시 endpoint — 진단 종료 후 삭제 필수.
 * 키 자체는 노출하지 않고 length + JWT role 만 표시.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function decodeJwtRole(token: string): { role: string | null; iss: string | null; valid: boolean } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { role: null, iss: null, valid: false };
    const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return { role: parsed.role ?? null, iss: parsed.iss ?? null, valid: true };
  } catch {
    return { role: null, iss: null, valid: false };
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const srInfo = decodeJwtRole(sr);
  const anonInfo = decodeJwtRole(anon);

  // 실제 query 시도 — content-queue 와 동일 filter
  let draftQueryResult: unknown = null;
  let draftQueryError: string | null = null;
  let publishedCount = 0;
  let publishedError: string | null = null;
  try {
    const sb = getServerClient();
    if (sb) {
      const draftResult = await sb
        .from('generated_contents')
        .select('id, status, title')
        .in('status', ['draft', 'pending'])
        .limit(5);
      draftQueryResult = draftResult.data;
      draftQueryError = draftResult.error?.message ?? null;

      const pubResult = await sb
        .from('generated_contents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published');
      publishedCount = pubResult.count ?? 0;
      publishedError = pubResult.error?.message ?? null;
    } else {
      draftQueryError = 'getServerClient returned null';
    }
  } catch (e) {
    draftQueryError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    env: {
      has_url: !!url,
      url_host: url ? new URL(url).host : null,
      service_role: {
        present: !!sr,
        length: sr.length,
        jwt_role: srInfo.role,
        jwt_iss: srInfo.iss,
        jwt_valid: srInfo.valid,
      },
      anon: {
        present: !!anon,
        length: anon.length,
        jwt_role: anonInfo.role,
      },
      keys_are_same_value: sr.length > 0 && sr === anon,
    },
    query_test: {
      draft_or_pending: {
        result: draftQueryResult,
        error: draftQueryError,
        count: Array.isArray(draftQueryResult) ? draftQueryResult.length : null,
      },
      published_count: publishedCount,
      published_error: publishedError,
    },
    note: '진단 완료 후 이 파일 삭제 필요 (medimap-blog-v2/src/app/api/admin/debug-env/route.ts)',
  });
}
