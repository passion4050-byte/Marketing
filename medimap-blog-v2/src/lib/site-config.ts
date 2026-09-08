/**
 * 사이트 전역 설정 — Figma 시안의 헤더/사이드바 라벨과 동일하게 유지.
 * 실제 운영 도메인은 env에서 주입.
 */

export const siteConfig = {
  name: 'WECIRCLE GEO',
  subtitle: 'Hospital AI Platform',
  description:
    '병원 데이터를 구조화·발행하고 ChatGPT · Claude · Gemini · Perplexity 인용을 추적하는 AEO/GEO SaaS.',
  // 🔴 Round 194 (2026-09-08) — 폴백이 프리뷰 호스트였다.
  //   geo.wecircle.co.kr 에는 NEXT_PUBLIC_SITE_URL 이 없어서 이 폴백이 그대로 나갔고,
  //   /sitemap.xml 과 /robots.txt 가 **다른 도메인(geo-v2-beta)** 을 광고하고 있었다.
  //   크롤러가 프리뷰 호스트로 유도되면 크롤 예산 낭비 + 중복 색인 위험이다.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geo.wecircle.co.kr',
  copyright: '© WECIRCLE GEO',
  // 자동 발행 대상이 되는 외부 채널
  channels: [
    { id: 'blog', label: '자사 블로그' },
    { id: 'naver', label: '네이버 블로그' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'video', label: '영상' },
    { id: 'faq', label: 'FAQ' }
  ] as const,
  // AI 크롤러 — robots.txt + llms.txt 노출 대상
  aiCrawlers: [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'Google-Extended',
    'Googlebot',
    'PerplexityBot',
    'Perplexity-User',
    'Bingbot',
    'CCBot'
  ]
} as const;

export const navGroups = [
  {
    id: 'geo',
    label: 'GEO SaaS',
    items: [
      { href: '/', icon: 'LayoutDashboard', label: 'AI 인용 현황 대시보드' }
    ]
  }
] as const;
