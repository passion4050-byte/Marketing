/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-05-24: SSG 빌드타임 Supabase pooler hang 회피.
  staticPageGenerationTimeout: 180,
  experimental: {
    serverComponentsExternalPackages: ["postgres"],
    // Round 165 — 스트레이 next.config.mjs(무시되던 파일)에만 있던 최적화를 정본으로 이관.
    //   lucide-react 아이콘 트리셰이킹 — 사용 아이콘만 번들에 포함.
    optimizePackageImports: ["lucide-react"],
  },
  // 이미지 외부 호스트 허용 (next/image 또는 raw <img>).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "https", hostname: "gifopyowyankfsfghhdi.supabase.co" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // Round 170 (2026-08-21) - bypass Vercel Image Optimization.
    //   /_next/image returned 402 PAYMENT_REQUIRED for ALL requests
    //   (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED): the Hobby plan's 5K/month
    //   image transformation quota was exhausted, so every image broke.
    //   Fix: render the original Supabase URL directly. The real fix is making
    //   the originals small - scripts/compress_post_images.py (1200px JPEG).
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
  },
  // 정적 자원 압축 (기본 true 지만 명시)
  compress: true,
  // poweredByHeader 제거 (보안 + 미세 byte 절약)
  poweredByHeader: false,

  // Round 30 (2026-05-30) — 옛 한글 slug → 새 영문 slug 301 redirect.
  // Migration 030 (Round 29) 으로 자사 6편 slug 영문화. 외부 공유된 옛 URL 의 AEO 손실 방지.
  async redirects() {
    return [
      // Round 123 (2026-07-04) — vercel.app 기본 도메인 → wecircle.co.kr 영구(308) 리디렉션.
      //   canonical 은 이미 wecircle 이지만, 실제 리디렉션까지 걸어 중복 색인·도메인 권위
      //   분산을 차단. host 조건이라 wecircle.co.kr 및 preview 배포에는 발동하지 않음.
      //   /api/* 는 제외 — 외부 훅/비콘이 vercel.app 호스트로 호출하는 경우 안전망.
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "medimap-blog-phi.vercel.app" }],
        destination: "https://wecircle.co.kr/:path",
        permanent: true,
      },
      { source: "/blog/의료-GEO-최적화-87", destination: "/blog/medical-geo-7-principles-87", permanent: true },
      { source: "/blog/의료법-광고-가이드라인-88", destination: "/blog/medical-law-advertising-guide-88", permanent: true },
      { source: "/blog/병원-마케팅-GEO-입문-89", destination: "/blog/hospital-marketing-geo-intro-89", permanent: true },
      { source: "/blog/환자가-우리-병원을-93", destination: "/blog/patient-search-channel-93", permanent: true },
      { source: "/blog/안전하고-신뢰받는-94", destination: "/blog/medical-law-compliance-checklist-94", permanent: true },
      { source: "/blog/병원-마케팅-GEO-97", destination: "/blog/empathy-content-strategy-97", permanent: true },
    ];
  },
};

module.exports = nextConfig;
