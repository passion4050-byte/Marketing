/** @type {import('next').NextConfig} */
const useBasePath = process.env.NEXT_PUBLIC_BASE_PATH === "/blog";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  basePath: useBasePath ? "/blog" : "",
  trailingSlash: false,
  compress: true,
  experimental: {
    // Tree-shake icon imports so only used lucide icons end up in the bundle.
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "medi-map.co.kr" },
      { protocol: "https", hostname: "team.medi-map.co.kr" },
      { protocol: "https", hostname: "www.figma.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Cache static Next.js assets aggressively (immutable, hashed names).
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Public images / fonts under /public.
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
