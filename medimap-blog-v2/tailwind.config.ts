import type { Config } from 'tailwindcss';

/**
 * MEDIMAP GEO — Hospital AI Platform 디자인 토큰
 *
 * Figma 레퍼런스(node 804:353)에서 추출한 팔레트.
 * 메인은 딥 티얼(#0E5A6B 류) — 의료 신뢰감 / AI 데이터 톤.
 * 기존 메디맵 강남언니 톤(#FF4D5E)은 이 프로그램에선 부수 강조용으로만 사용.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem'
    },
    extend: {
      colors: {
        // 메인 팔레트 (딥 티얼 시그니처)
        brand: {
          DEFAULT: '#0E5A6B',
          50: '#F0F7F8',
          100: '#E0EDEF',
          200: '#B9D7DC',
          300: '#8DBFC7',
          400: '#5FA3AE',
          500: '#0E5A6B',
          600: '#0B4C5A',
          700: '#093D49',
          800: '#062E37',
          900: '#031F25',
          dark: '#0B4C5A',
          ink: '#062E37'
        },
        // 보조 액센트 — 데이터 강조 (밝은 민트)
        accent: {
          DEFAULT: '#15B8A6',
          soft: '#CCFBF1',
          deep: '#0F766E'
        },
        // 표면 (light surfaces)
        surface: {
          base: '#FFFFFF',
          subtle: '#F7F9FA',
          muted: '#F1F4F6'
        },
        border: {
          DEFAULT: '#E5EBED',
          strong: '#CBD5DA'
        },
        ink: {
          DEFAULT: '#0F172A',
          soft: '#334155',
          muted: '#64748B',
          faint: '#94A3B8'
        },
        // 상태 — KPI 변화율, 칩, 차트
        status: {
          success: '#10B981',
          successSoft: '#D1FAE5',
          warning: '#F59E0B',
          warningSoft: '#FEF3C7',
          danger: '#EF4444',
          dangerSoft: '#FEE2E2',
          neutral: '#94A3B8',
          neutralSoft: '#E2E8F0'
        },
        // LLM 엔진 시그니처 색 (4-엔진 비교 차트용)
        engine: {
          chatgpt: '#10A37F',
          claude: '#D97706',
          gemini: '#4285F4',
          perplexity: '#20B2AA'
        }
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'sans-serif'
        ],
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      fontSize: {
        'kpi': ['2.5rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'kpi-sm': ['2rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.01em' }]
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.75rem',
        '2xl': '1rem'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)',
        cardHover: '0 4px 12px rgba(15, 23, 42, 0.08)',
        focus: '0 0 0 3px rgba(14, 90, 107, 0.18)'
      },
      keyframes: {
        livePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'live-pulse': 'livePulse 1.6s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite'
      }
    }
  },
  plugins: []
};

export default config;
