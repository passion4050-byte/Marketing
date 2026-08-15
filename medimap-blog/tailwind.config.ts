import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}", "./content/**/*.{md,mdx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // 메디맵 디자인 시스템 — Primary 블루 #1B68FF + Sub Mint #1AD2A4
        // 광고대행사 시안 references/design-tokens.md 기반
        brand: {
          DEFAULT: "#1B68FF",
          50: "#EEF4FF",
          100: "#DCE9FF",
          200: "#B5D0FF",
          300: "#88B3FF",
          400: "#5290FF",
          500: "#1B68FF",
          600: "#1456D6",
          700: "#0E44AD",
          800: "#0A3585",
          900: "#06255C",
        },
        accent: {
          DEFAULT: "#1AD2A4",
          50: "#E8FBF6",
          100: "#C8F4E7",
          200: "#92E7D0",
          300: "#57D7B7",
          400: "#2EC9A8",
          500: "#1AD2A4",
          600: "#15A887",
          700: "#0F7E66",
        },
        ink: {
          DEFAULT: "#0B1224",
          muted: "#364153",
          // Round 82: 여러 페이지가 text-ink-soft 를 쓰는데 토큰이 없어 색이 안 먹던
          //   가독성 버그 수정. muted 와 subtle 사이 중간 본문 보조색.
          soft: "#475467",
          subtle: "#667085",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F5F7FA",
          hover: "#EEF1F8",
        },
        line: "#E4E7EC",
        // Round 146 Magazine B — 에디토리얼 토큰 (공개 사이트 전용).
        //   공개 페이지들이 stone-* 를 하드코딩해 온 것을 정식 토큰화. brand/accent 는
        //   어드민·클라이언트 포털이 사용하므로 유지 — 공개 사이트에선 인터랙션
        //   (hover·포커스)에만 brand 허용, 면(배경·그라데이션) 사용 금지.
        paper: "#FAFAF7",
        rule: {
          DEFAULT: "#E7E5E4", // stone-200 — 기본 헤어라인
          strong: "#D6D3D1",  // stone-300
          heavy: "#0C0A09",   // stone-950 — 페이지당 1회 헤비룰
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "display-lg": ["56px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["40px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline": ["32px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
      },
      borderRadius: {
        pill: "9999px",
        card: "16px",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(11,18,36,0.06), 0 1px 2px rgba(11,18,36,0.04)",
        card: "0 4px 12px rgba(11,18,36,0.06), 0 2px 4px rgba(11,18,36,0.04)",
        cta: "0 4px 6px rgba(27,104,255,0.20), 0 2px 4px rgba(27,104,255,0.12)",
        glow: "0 0 0 1px rgba(27,104,255,0.20), 0 12px 32px -8px rgba(27,104,255,0.32)",
      },
      maxWidth: { content: "1280px", prose: "75ch" },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(27,104,255,0.08), transparent 50%), linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
        "brand-mesh":
          "radial-gradient(at 12% 20%, rgba(27,104,255,0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(26,210,164,0.18) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(27,104,255,0.10) 0px, transparent 50%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "shimmer": "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
