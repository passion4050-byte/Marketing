import { ImageResponse } from "next/og";

export const alt = "위서클 — 헬스케어의 미래를 함께 만들어갑니다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";
// See blog/[slug]/opengraph-image.tsx for the rationale — Windows build sidestep.
export const dynamic = "force-dynamic";

// Default OG card. Per Next.js App Router file conventions, this is auto-applied
// to /, /about, /contact, /guide, /blog (root) — any route that doesn't colocate
// its own opengraph-image.tsx. Inline hex permitted (next/og runs outside Tailwind).
export default function OpengraphImage() {
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
        {/* Top: brand mark + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.18)",
              borderRadius: 18,
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          >
            M
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              opacity: 0.95,
            }}
          >
            WECIRCLE
          </div>
        </div>

        {/* Bottom: headline + tagline anchored bottom-left */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            헬스케어의 미래를{"\n"}함께 만들어갑니다
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              opacity: 0.92,
              letterSpacing: "-0.01em",
            }}
          >
            환자와 병·의원을 잇는 디지털 헬스케어 플랫폼
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
