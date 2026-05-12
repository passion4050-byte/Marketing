/**
 * On-demand ISR 무효화 endpoint.
 *
 * 자동 발행으로 새 글이 published 되면 medimap-blog 의 ISR 캐시를 즉시
 * invalidate 해야 사용자가 1분 안 기다리고 라이브에서 본다. 이 endpoint 가
 * `/blog`, `/blog/[slug]`, `/sitemap.xml`, `/` 를 한 번에 revalidate.
 *
 * 보안: `REVALIDATE_TOKEN` 환경변수 설정 시 Authorization header 필수.
 * 미설정 시 (개발/임시) 누구나 호출 가능 — production 에선 반드시 token 세팅.
 *
 * 사용:
 *   curl -X POST -H "Authorization: Bearer $TOKEN" \
 *     "https://medimap-blog-phi.vercel.app/api/revalidate?path=/blog/강남라식-4"
 *   curl -X POST -H "Authorization: Bearer $TOKEN" \
 *     "https://medimap-blog-phi.vercel.app/api/revalidate"   # 모든 blog 라우트
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const token = process.env.REVALIDATE_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const revalidated: string[] = [];

  if (path) {
    revalidatePath(path);
    revalidated.push(path);
  } else {
    // 일괄 무효화 — 자동 발행 직후 호출 시나리오
    revalidatePath("/blog/[slug]", "page");
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    revalidatePath("/");
    revalidated.push("/blog/[slug]", "/blog", "/sitemap.xml", "/");
  }

  return NextResponse.json({
    ok: true,
    revalidated,
    tokenProtected: !!token,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  // 편의용 — 브라우저에서 직접 호출 가능
  return handle(req);
}
