import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Brand canonical (CLAUDE.md "Cross-site design sync"): #FF4D5E → #FF6B35.
// Inline hex permitted here — `next/og` ImageResponse runs outside Tailwind.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FF4D5E 0%, #FF6B35 100%)",
          color: "#FFFFFF",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-0.05em",
          borderRadius: 6,
        }}
      >
        M
      </div>
    ),
    { ...size },
  );
}
