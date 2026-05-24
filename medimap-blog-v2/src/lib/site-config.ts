/**
 * 사이트 전역 설정 — Figma 시안의 헤더/사이드바 라벨과 동일하게 유지.
 * 실제 운영 도메인은 env에서 주입.
 */

export const siteConfig = {
  name: 'MEDIMAP GEO',
  subtitle: 'Hospital AI Platform',
  description:
    '병원 데이터를 구조화·발행하고 ChatGPT · Claude · Gemini · Perplexity 인용을 추적하는 AEO/GEO SaaS.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://medimap-geo.vercel.app',
  copyright: '© MEDIMAP GEO',
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
      { href: '/', icon: 'LayoutDashboard', label: '통합 대시보드 & AI 모니터링' },
      { href: '/data-feeding', icon: 'Database', label: 'Data Feeding' },
      { href: '/simulator', icon: 'MessageSquareDot', label: 'Simulator' }
    ]
  },
  {
    id: 'distribute',
    label: '콘텐츠 배포',
    items: [
      { href: '/ai-code', icon: 'Code2', label: 'AI 코드 (JSON-LD)' },
      { href: '/faq', icon: 'FileText', label: 'FAQ & Q&A 텍스트' },
      { href: '/blog', icon: 'BookOpenText', label: '블로그 콘텐츠' },
      { href: '/video', icon: 'Clapperboard', label: '영상 스크립트' }
    ]
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [{ href: '/admin/funnel', icon: 'Database', label: 'Funnel · ROI' }]
  }
] as const;
