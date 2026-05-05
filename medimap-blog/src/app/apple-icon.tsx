import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Brand canonical (CLAUDE.md "Cross-site design sync"): #FF4D5E → #FF6B35.
export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 900,
          letterSpacing: "-0.06em",
          borderRadius: 36,
        }}
      >
        M
      </div>
    ),
    { ...size },
  );
}
