/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-05-24: SSG 빌드타임에 Supabase pooler 연결이 hang 걸려
  // 기본 60초 timeout 으로 SIGTERM. 180초로 늘려 안전 마진 확보.
  // 동시에 lib/posts.ts 의 DB 쿼리에 명시적 8초 timeout 가드 추가됐음.
  staticPageGenerationTimeout: 180,

  // Vercel Edge runtime 인식 경고 회피 (twitter-image.tsx 등)
  experimental: {
    serverComponentsExternalPackages: ["postgres"],
  },
};

module.exports = nextConfig;
