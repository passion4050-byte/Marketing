/** @type {import('next').NextConfig} */
const useBasePath = process.env.NEXT_PUBLIC_BASE_PATH === "/blog";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  basePath: useBasePath ? "/blog" : "",
  trailingSlash: false,
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
        ],
      },
    ];
  },
};

export default nextConfig;
