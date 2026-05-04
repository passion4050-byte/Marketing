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
        brand: {
          DEFAULT: "#0057FF",
          50: "#EAF1FF",
          100: "#D6E4FF",
          200: "#ADC8FF",
          300: "#84ABFF",
          400: "#5B8FFF",
          500: "#0057FF",
          600: "#0046CC",
          700: "#003599",
          800: "#002566",
          900: "#001433",
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
        cta: "0 4px 6px rgba(0,87,255,0.18), 0 2px 4px rgba(0,87,255,0.10)",
      },
      maxWidth: { content: "1280px", prose: "75ch" },
    },
  },
  plugins: [],
};

export default config;
