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
        // 강남언니 톤 — 핫핑크 브랜드 + 오렌지-레드 액센트
        brand: {
          DEFAULT: "#FF4D5E",
          50: "#FFF1F3",
          100: "#FFE0E5",
          200: "#FFC2CB",
          300: "#FFA0AE",
          400: "#FF7787",
          500: "#FF4D5E",
          600: "#E63746",
          700: "#C2202F",
          800: "#931620",
          900: "#5C0D14",
        },
        accent: {
          DEFAULT: "#FF6B35",
          50: "#FFF3EE",
          100: "#FFE3D6",
          200: "#FFC4A8",
          300: "#FFA478",
          400: "#FF884F",
          500: "#FF6B35",
          600: "#E2521F",
          700: "#B53D14",
        },
        ink: {
          DEFAULT: "#101828",
          muted: "#364153",
          subtle: "#667085",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F5F7FA",
          hover: "#EEF2F7",
        },
        line: "#E4E7EC",
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
        soft: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
        card: "0 4px 12px rgba(16,24,40,0.06), 0 2px 4px rgba(16,24,40,0.04)",
        cta: "0 4px 6px rgba(255,77,94,0.20), 0 2px 4px rgba(255,77,94,0.12)",
        glow: "0 0 0 1px rgba(255,77,94,0.20), 0 12px 32px -8px rgba(255,77,94,0.32)",
      },
      maxWidth: { content: "1280px", prose: "75ch" },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(255,77,94,0.08), transparent 50%), linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
        "brand-mesh":
          "radial-gradient(at 12% 20%, rgba(255,77,94,0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255,107,53,0.18) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(255,77,94,0.10) 0px, transparent 50%)",
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
