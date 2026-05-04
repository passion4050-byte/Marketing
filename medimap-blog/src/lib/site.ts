export const siteConfig = {
  name: "메디맵",
  brand: "MEDIMAP",
  tagline: "헬스케어의 미래를 함께 만들어갑니다",
  description:
    "메디맵은 Medical과 Map의 합성어로, 건강을 찾을 수 있는 지도를 만들어 환자와 병·의원을 연결합니다.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://medimap.kr",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  shortlinkBase:
    process.env.NEXT_PUBLIC_SHORTLINK_BASE || "https://m.medimap.kr/r",
  contact: {
    kakao:
      process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL || "https://pf.kakao.com/_xxxxx",
    naverPlace:
      process.env.NEXT_PUBLIC_NAVER_PLACE_URL ||
      "https://map.naver.com/v5/search/메디맵",
    phone: process.env.NEXT_PUBLIC_PHONE || "02-0000-0000",
  },
  ga: process.env.NEXT_PUBLIC_GA_ID || "",
  gtm: process.env.NEXT_PUBLIC_GTM_ID || "",
  publisher: {
    name: "메디맵",
    legalName: "주식회사 메디맵",
    logo: "/medimap-logo.svg",
  },
} as const;

export const navItems = [
  { href: "/about", label: "회사소개" },
  { href: "/guide", label: "병원 입점 가이드", primary: true },
  { href: "/blog", label: "블로그" },
  { href: "/contact", label: "제휴문의" },
] as const;

export function absoluteUrl(path: string): string {
  const base = siteConfig.url.replace(/\/$/, "");
  const bp = siteConfig.basePath || "";
  if (path.startsWith("http")) return path;
  return `${base}${bp}${path.startsWith("/") ? "" : "/"}${path}`;
}
