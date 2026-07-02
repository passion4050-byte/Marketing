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
 * Round 106 (2026-07-02): 이미지 생성을 Gemini Imagen 3 로 전환.
 * OpenAI tier 2 프로젝트는 dall-e-3/dall-e-2 접근 불가 (400 does not exist).
 * Gemini paid tier 로 우회. 응답은 base64 → Buffer 로 반환 (URL 아님).
 *
 * env:
 *   GEMINI_API_KEY (필수, GH Actions + Vercel 등록 완료)
 *   GEMINI_IMAGE_MODEL (선택, default: imagen-3.0-generate-002)
 *
 * OpenAI 로 회귀 옵션: env 에 `IMAGE_PROVIDER=openai` 설정 시.
 */
async function generateImageBytes(prompt: string): Promise<{ bytes: Uint8Array; revised: string; provider: string } | null> {
  const provider = (process.env.IMAGE_PROVIDER || 'gemini').trim().toLowerCase();

  if (provider === 'openai' || provider === 'dalle') {
    return callOpenAiImage(prompt);
  }
  return callGeminiImagen(prompt);
}

/**
 * Gemini 이미지 생성 fallback 체인 — 모델명 자주 변경되므로 여러 개 순차 시도.
 * generateContent(inlineData.data) 와 predict(bytesBase64Encoded) 두 endpoint 지원.
 * env `GEMINI_IMAGE_MODEL` 지정 시 그것만 시도.
 */
type GeminiImgSpec = { name: string; endpoint: 'generateContent' | 'predict' };
// Round 107 (2026-07-03) — ListModels API 로 실제 접근 가능한 모델 확정.
// 사용자 API key = Nano Banana 전 시리즈 + Imagen 4 접근 가능.
// 우선순위: 나노바나나 기본 (안정) → Pro → Imagen 4 (predict endpoint)
const GEMINI_IMAGE_FALLBACKS: GeminiImgSpec[] = [
  { name: 'gemini-2.5-flash-image', endpoint: 'generateContent' },       // Nano Banana (기본, 안정)
  { name: 'gemini-3-pro-image', endpoint: 'generateContent' },           // Nano Banana Pro (최신)
  { name: 'gemini-3.1-flash-image', endpoint: 'generateContent' },       // Nano Banana 2
  { name: 'imagen-4.0-generate-001', endpoint: 'predict' },              // Imagen 4 (별도 endpoint)
  { name: 'imagen-4.0-fast-generate-001', endpoint: 'predict' },         // Imagen 4 Fast (fallback)
];

async function callGeminiOneModel(spec: GeminiImgSpec, prompt: string, apiKey: string): Promise<Uint8Array | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${spec.name}:${spec.endpoint}?key=${apiKey}`;
  const body = spec.endpoint === 'generateContent'
    ? {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['Text', 'Image'] },
      }
    : {
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9', personGeneration: 'allow_adult' },
      };
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`regenerate-image: ${spec.name} 실패`, resp.status, errText.slice(0, 300));
      return null;
    }
    const j = await resp.json();
    let b64: string | undefined;
    if (spec.endpoint === 'generateContent') {
      const parts = j?.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data);
      b64 = imgPart?.inlineData?.data;
    } else {
      b64 = j?.predictions?.[0]?.bytesBase64Encoded;
    }
    if (!b64 || typeof b64 !== 'string') {
      console.error(`regenerate-image: ${spec.name} 응답에 이미지 없음`, JSON.stringify(j).slice(0, 300));
      return null;
    }
    return Uint8Array.from(Buffer.from(b64, 'base64'));
  } catch (e) {
    console.error(`regenerate-image: ${spec.name} fetch 예외`, e);
    return null;
  }
}

async function callGeminiImagen(prompt: string): Promise<{ bytes: Uint8Array; revised: string; provider: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('regenerate-image: GEMINI_API_KEY 미설정');
    return null;
  }
  const override = (process.env.GEMINI_IMAGE_MODEL || '').trim();
  const chain: GeminiImgSpec[] = override
    ? [{ name: override, endpoint: override.includes('imagen') ? 'predict' : 'generateContent' }]
    : GEMINI_IMAGE_FALLBACKS;

  for (const spec of chain) {
    const bytes = await callGeminiOneModel(spec, prompt, apiKey);
    if (bytes && bytes.byteLength > 1024) {
      console.log(`regenerate-image: ${spec.name} 성공 (${bytes.byteLength} bytes)`);
      return { bytes, revised: prompt, provider: `gemini:${spec.name}` };
    }
  }
  console.error('regenerate-image: 모든 Gemini 이미지 모델 실패');
  return null;
}

/** OpenAI Image API 회귀용 — 사용자가 IMAGE_PROVIDER=openai 설정 시 (tier 3 upgrade 후) */
async function callOpenAiImage(prompt: string): Promise<{ bytes: Uint8Array; revised: string; provider: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = (process.env.OPENAI_IMAGE_MODEL || 'dall-e-3').trim();
  try {
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        prompt,
        size: model === 'dall-e-3' ? '1792x1024' : '1024x1024',
        n: 1,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`regenerate-image: OpenAI ${model} 실패`, resp.status, errText.slice(0, 300));
      return null;
    }
    const j = await resp.json();
    const imageUrl = j?.data?.[0]?.url;
    if (!imageUrl) return null;
    // URL 다운로드 → bytes 변환 (Storage 업로드 로직 통일)
    const dl = await fetch(imageUrl);
    if (!dl.ok) return null;
    const bytes = new Uint8Array(await dl.arrayBuffer());
    return { bytes, revised: j?.data?.[0]?.revised_prompt || prompt, provider: `openai:${model}` };
  } catch (e) {
    console.error('regenerate-image: OpenAI fetch 예외', e);
    return null;
  }
}

/** bytes → Supabase Storage 업로드 → public URL (Round 106 통일 시그니처) */
async function uploadBytesToStorage(bytes: Uint8Array, keyword: string, contentId: string | number): Promise<string | null> {
  const supaUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supaUrl || !svcKey) {
    console.error('regenerate-image: Supabase env 미설정');
    return null;
  }
  if (!bytes || bytes.byteLength < 1024) return null;
  try {
    // Round 107 (2026-07-03) — 실제 버킷 이름 = post-images (기존 이미지 URL 로 확인).
    // Nano Banana 는 성공했는데 blog-images 버킷 없어서 업로드 400 남.
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'post-images';
    // Round 107 hotfix 2 — Supabase Storage object key 는 ASCII 만 허용 (한글 → InvalidKey 400).
    // 한글 제거 → 영문/숫자/dash 만. 빈 문자열이면 'regen' 폴더로 fallback.
    const asciiSlug = keyword.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'regen';
    const ts = Date.now();
    const objectPath = `${asciiSlug}/regen-${contentId}-${ts}.png`;

    // Round 106 hotfix: TS strict — Uint8Array 를 BodyInit 로 직접 못 넘김. Blob 으로 감쌈.
    const up = await fetch(`${supaUrl}/storage/v1/object/${bucket}/${objectPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${svcKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: new Blob([bytes as BlobPart], { type: 'image/png' }),
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

  // 2. 이미지 생성 (Round 106: Gemini Imagen 3 기본, IMAGE_PROVIDER=openai 로 회귀 가능)
  const prompt = buildKoreanPrompt(kw, title, isSelfTenant);
  const img = await generateImageBytes(prompt);
  if (!img) {
    return NextResponse.json(
      {
        error: '이미지 생성 실패',
        hint: 'GEMINI_API_KEY / quota / 네트워크 확인. Vercel Runtime Logs 참조.',
      },
      { status: 502 },
    );
  }

  // 3. Storage 업로드
  const publicUrl = await uploadBytesToStorage(img.bytes, kw, contentId);
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
    { diff: { targetIndex, provider: img.provider, keyword: kw } },
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    targetIndex,
    url: publicUrl,
    provider: img.provider,
    revised_prompt: img.revised.slice(0, 300),
  });
}
