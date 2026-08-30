import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/posts";

export const alt = "위서클 블로그";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

// Generated on-demand at first SNS crawler hit, then cached at the Vercel edge.
// Prerendering at build time fails on Windows due to a `@vercel/og` URL
// resolution bug (`import.meta.url` + `path.join` → invalid URL on win32).
// `force-dynamic` sidesteps the bug while keeping the perceived static feel
// for users — the Function invocation only happens on the very first crawl.
export const dynamic = "force-dynamic";

export default async function BlogPostOgImage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  const title = post?.title ?? "위서클 블로그";
  const category = post?.category ?? "헬스케어 인사이트";
  const reviewedBy = post?.reviewedBy;
  // Satori 에는 line-clamp 가 없다 — 카드 밖으로 넘치지 않게 문자열에서 자른다.
  const clampedTitle = title.length > 62 ? `${title.slice(0, 62)}…` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0C0A09", // Round 148-d — 잉크 단색 (Magazine B 로우컬러)
          padding: 80,
          color: "#FFFFFF",
          fontFamily:
            "system-ui, -apple-system, 'Pretendard Variable', sans-serif",
        }}
      >
        {/* Top: brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.18)",
              borderRadius: 14,
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          >
            M
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              opacity: 0.95,
            }}
          >
            WECIRCLE
          </div>
          <div
            style={{
              marginLeft: 16,
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {category}
          </div>
        </div>

        {/* Middle: post title (bottom-anchored) */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {/*
            🔴 Round 181 — Satori 는 `display: -webkit-box` / WebkitLineClamp 를
              모른다. flex 로 바꾸고 길이는 JS 에서 잘라 넘긴다(위 clampedTitle).
          */}
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "-0.035em",
              lineHeight: 1.15,
              overflow: "hidden",
            }}
          >
            {clampedTitle}
          </div>
          {reviewedBy && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 500,
                opacity: 0.92,
                letterSpacing: "-0.01em",
              }}
            >
              {`의료진 검수: ${reviewedBy}`}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
