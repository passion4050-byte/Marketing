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
    kakao: "https://pf.kakao.com/_xnWQkG",
    naverPlace: "https://map.naver.com/p/search/%EB%A9%94%EB%94%94%EB%A7%B5/place/1091694610?c=15.00,0,0,0,dh&placePath=/home?bk_query=%EB%A9%94%EB%94%94%EB%A7%B5&entry=bmp&from=map&fromPanelNum=2&timestamp=202605242051&locale=ko&svcName=map_pcv5&searchText=%EB%A9%94%EB%94%94%EB%A7%B5",
    phone: process.env.NEXT_PUBLIC_PHONE || "02-0000-0000",
    medimapMain: "https://medi-map.co.kr",
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
  { href: "/with-partners", label: "파트너 콘텐츠" },
  { href: "/contact", label: "제휴문의" },
] as const;

export function absoluteUrl(path: string): string {
  const base = siteConfig.url.replace(/\/$/, "");
  const bp = siteConfig.basePath || "";
  if (path.startsWith("http")) return path;
  return `${base}${bp}${path.startsWith("/") ? "" : "/"}${path}`;
}
