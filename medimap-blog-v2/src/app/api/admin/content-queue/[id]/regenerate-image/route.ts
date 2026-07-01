/**
 * POST /api/admin/content-queue/[id]/regenerate-image
 *
 * Round 105-b (2026-06-29) — 이미지별 개별 재생성.
 *
 * body: { targetIndex: number, keyword?: string }
 *   targetIndex = 0  → cover_image_url 재생성
 *   targetIndex >= 1 → body 내 N번째 <img> src 교체 (1-based)
 *
 * 흐름:
 *   1. content-queue row 조회 → keyword/title/tenant/domain_category
 *   2. DALL-E 3 호출 (한국인 모델 프롬프트, is_self_tenant 판단)
 *   3. Supabase Storage 업로드 → public URL
 *   4. targetIndex==0 → UPDATE generated_contents SET cover_image_url=? WHERE id=?
 *      targetIndex>=1 → body 파싱 → N번째 img src 교체 → UPDATE body
 *   5. audit log
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** DALL-E 3 한국인 모델 프롬프트 (Python dalle_client._build_dalle_korean_prompt 미러) */
function buildKoreanPrompt(keyword: string, title: string | null, isSelfTenant: boolean): string {
  const titleHint = title ? `, concept: ${title}` : '';
  if (isSelfTenant) {
    return (
      `Editorial photography for a Korean medical magazine. ` +
      `Korean (ethnically East Asian) medical professional and Korean patient ` +
      `in a modern Seoul medical clinic, theme: ${keyword}${titleHint}. ` +
      `All subjects are clearly Korean (not Western, not Caucasian). ` +
      `Authentic Korean facial features. Natural Korean skin tones. ` +
      `Modern bright clinic interior, soft natural daylight, warm and trustworthy mood. ` +
      `Professional DSLR photography, shallow depth of field, sharp focus, ` +
      `realistic photo (not illustration, not anime). ` +
      `8k uhd, magazine editorial quality. ` +
      `No text, no logo, no watermark, no overlay.`
    );
  }
  return (
    `Professional photograph of a Korean (ethnically East Asian) medical doctor ` +
    `consulting with a Korean patient, theme: ${keyword}${titleHint}. ` +
    `Both subjects clearly Korean (East Asian features, NOT Western/Caucasian). ` +
    `Modern bright Korean medical clinic interior in Seoul. ` +
    `Warm natural lighting, friendly and trustworthy atmosphere. ` +
    `Photorealistic (not illustration), professional camera quality, ` +
    `shallow depth of field, sharp detail. ` +
    `No text, no logo, no watermark.`
  );
}

/**
 * OpenAI Image API 호출 → 이미지 URL (일시적, 1시간 만료).
 *
 * Round 105-b hotfix 5 (2026-07-02): dall-e-3 모델 접근이 없는 프로젝트를 위해
 *   `OPENAI_IMAGE_MODEL` env 로 모델명 override 가능 (default: dall-e-3).
 *   3-단계 fallback 체인:
 *     1. env 지정 모델 (또는 dall-e-3)
 *     2. dall-e-2 (레거시 안정, 대부분 프로젝트 접근 가능)
 *     3. gpt-image-1 (최신, base64 응답이라 별도 처리 필요 — 여기선 skip)
 */
async function callDalle(prompt: string): Promise<{ url: string; revised: string; model: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('regenerate-image: OPENAI_API_KEY 미설정');
    return null;
  }

  const primary = (process.env.OPENAI_IMAGE_MODEL || 'dall-e-3').trim();
  // 모델별 파라미터
  const paramsFor = (model: string) => {
    if (model === 'dall-e-3') {
      return { model, prompt, size: '1792x1024', quality: 'standard', n: 1 };
    }
    // dall-e-2: 최대 1024x1024, quality 미지원
    return { model, prompt, size: '1024x1024', n: 1 };
  };

  const models = [primary, primary === 'dall-e-2' ? 'dall-e-3' : 'dall-e-2'];
  let lastErr = '';

  for (const model of models) {
    try {
      const resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(paramsFor(model)),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.error(`regenerate-image: ${model} 실패`, resp.status, errText.slice(0, 300));
        lastErr = `${model}: ${resp.status} ${errText.slice(0, 200)}`;
        continue; // 다음 모델 시도
      }
      const j = await resp.json();
      const url = j?.data?.[0]?.url;
      const revised = j?.data?.[0]?.revised_prompt || prompt;
      if (!url) {
        lastErr = `${model}: no url in response`;
        continue;
      }
      console.log(`regenerate-image: ${model} 성공`);
      return { url, revised, model };
    } catch (e) {
      console.error(`regenerate-image: ${model} fetch 예외`, e);
      lastErr = `${model} exception: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  console.error('regenerate-image: 모든 모델 실패 —', lastErr);
  return null;
}

/** DALL-E URL 다운로드 → Supabase Storage 업로드 → public URL */
async function uploadToStorage(dalleUrl: string, keyword: string, contentId: string | number): Promise<string | null> {
  const supaUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supaUrl || !svcKey) {
    console.warn('regenerate-image: Supabase Storage env 미설정 — raw DALL-E URL 반환');
    return dalleUrl;
  }
  try {
    const imgResp = await fetch(dalleUrl);
    if (!imgResp.ok) return null;
    const bytes = new Uint8Array(await imgResp.arrayBuffer());
    if (bytes.byteLength < 1024) return null;

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'blog-images';
    const slug = keyword.replace(/[^a-zA-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'img';
    const ts = Date.now();
    const objectPath = `${slug}/regen-${contentId}-${ts}.png`;

    const up = await fetch(`${supaUrl}/storage/v1/object/${bucket}/${objectPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${svcKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: bytes,
    });
    if (up.ok || up.status === 201 || up.status === 200) {
      return `${supaUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
    }
    const errT = await up.text().catch(() => '');
    console.error('regenerate-image: Storage 업로드 실패', up.status, errT.slice(0, 200));
    return null;
  } catch (e) {
    console.error('regenerate-image: Storage 업로드 예외', e);
    return null;
  }
}

/** body 내 N번째 <img> src 를 새 URL 로 교체 (1-based) */
function replaceNthImgSrc(html: string, n: number, newSrc: string): { updated: string; replaced: boolean } {
  let idx = 0;
  let replaced = false;
  const updated = html.replace(/<img\b[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*>/gi, (match, oldSrc) => {
    idx += 1;
    if (idx === n && !replaced) {
      replaced = true;
      return match.replace(oldSrc, newSrc);
    }
    return match;
  });
  return { updated, replaced };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const contentId = params.id;
  let body: { targetIndex?: number; keyword?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const targetIndex = Number(body.targetIndex ?? 0);
  if (!Number.isFinite(targetIndex) || targetIndex < 0) {
    return NextResponse.json({ error: 'targetIndex(number>=0) 필요' }, { status: 400 });
  }

  const sb = getServerClient();
  if (!sb) return NextResponse.json({ error: 'Supabase client 없음' }, { status: 500 });

  // 1. row 조회
  const { data: row, error: fetchErr } = await sb
    .from('generated_contents')
    .select('id, tenant_id, keyword_text, title, body, cover_image_url')
    .eq('id', contentId)
    .maybeSingle();
  if (fetchErr || !row) {
    return NextResponse.json({ error: 'content 조회 실패', detail: fetchErr?.message }, { status: 404 });
  }
  const kw = body.keyword || row.keyword_text || row.title || '한국 병원 진료 상담';
  const title = row.title || null;
  const isSelfTenant = row.tenant_id === 12; // 메디맵/wecircle 자사 인사이트

  // 2. DALL-E 호출
  const prompt = buildKoreanPrompt(kw, title, isSelfTenant);
  const dalle = await callDalle(prompt);
  if (!dalle) {
    return NextResponse.json(
      {
        error: 'DALL-E 실패',
        hint: 'OPENAI_API_KEY / quota / 네트워크 확인. 로그 참조.',
      },
      { status: 502 },
    );
  }

  // 3. Storage 업로드
  const publicUrl = await uploadToStorage(dalle.url, kw, contentId);
  if (!publicUrl) {
    return NextResponse.json({ error: 'Storage 업로드 실패' }, { status: 502 });
  }

  // 4. 대상 컬럼 갱신
  if (targetIndex === 0) {
    // cover 교체
    const { error: upErr } = await sb
      .from('generated_contents')
      .update({ cover_image_url: publicUrl, cover_image_alt: title || kw })
      .eq('id', contentId);
    if (upErr) {
      return NextResponse.json({ error: 'cover 업데이트 실패', detail: upErr.message }, { status: 500 });
    }
  } else {
    // body 내 N번째 img 교체
    if (!row.body) {
      return NextResponse.json({ error: 'body 없음' }, { status: 400 });
    }
    const { updated, replaced } = replaceNthImgSrc(row.body, targetIndex, publicUrl);
    if (!replaced) {
      return NextResponse.json({ error: `본문 ${targetIndex}번째 <img> 없음` }, { status: 400 });
    }
    const { error: upErr } = await sb
      .from('generated_contents')
      .update({ body: updated })
      .eq('id', contentId);
    if (upErr) {
      return NextResponse.json({ error: 'body 업데이트 실패', detail: upErr.message }, { status: 500 });
    }
  }

  // 5. audit log
  await logAudit(
    req,
    sb,
    'regenerate-image',
    `generated_content:${contentId}`,
    { diff: { targetIndex, source: 'dalle3', keyword: kw } },
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    targetIndex,
    url: publicUrl,
    revised_prompt: dalle.revised.slice(0, 300),
  });
}
