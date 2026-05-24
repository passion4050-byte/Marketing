/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-05-24: SSG 빌드타임 Supabase pooler hang 회피.
  staticPageGenerationTimeout: 180,
  experimental: {
    serverComponentsExternalPackages: ["postgres"],
  },
  // 이미지 외부 호스트 허용 (next/image 또는 raw <img>).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "https", hostname: "gifopyowyankfsfghhdi.supabase.co" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  // 정적 자원 압축 (기본 true 지만 명시)
  compress: true,
  // poweredByHeader 제거 (보안 + 미세 byte 절약)
  poweredByHeader: false,
};

module.exports = nextConfig;
