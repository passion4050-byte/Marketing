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
        accent: {
          DEFAULT: "#7C5CFF",
          50: "#F2EEFF",
          100: "#E1D9FF",
          200: "#C4B3FF",
          300: "#A88EFF",
          400: "#8C68FF",
          500: "#7C5CFF",
          600: "#5F3FE0",
          700: "#4226B3",
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
        glow: "0 0 0 1px rgba(0,87,255,0.18), 0 12px 32px -8px rgba(0,87,255,0.30)",
      },
      maxWidth: { content: "1280px", prose: "75ch" },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(0,87,255,0.08), transparent 50%), linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
        "brand-mesh":
          "radial-gradient(at 12% 20%, rgba(0,87,255,0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(124,92,255,0.18) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(0,87,255,0.10) 0px, transparent 50%)",
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
        "accordion-down": {
          "0%": { gridTemplateRows: "0fr" },
          "100%": { gridTemplateRows: "1fr" },
        },
        "accordion-up": {
          "0%": { gridTemplateRows: "1fr" },
          "100%": { gridTemplateRows: "0fr" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "accordion-down": "accordion-down 0.22s ease",
        "accordion-up": "accordion-up 0.22s ease",
        "shimmer": "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
