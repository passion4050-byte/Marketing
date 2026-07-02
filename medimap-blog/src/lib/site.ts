// Round 90 (2026-06-28) — wecircle 리브랜딩 (옵션 C 하이브리드).
//   사이트 브랜드 = WECIRCLE (새 운영사) / 콘텐츠 컨셉 = "위서클 인사이트" (카테고리 라벨) 유지.
//   사업자: 798-67-00527 · 서울 서초구 사임당로 8길 13 · 도메인 wecircle.co.kr.
//   카카오톡/연락처는 위서클 채널 당분간 그대로 (사용자 결정: 새 카톡은 추후).
export const siteConfig = {
  name: "WECIRCLE",
  brand: "WECIRCLE",
  tagline: "AI 검색 시대, 병원 마케팅을 다시 설계합니다",
  description:
    "WECIRCLE 은 AI 검색 시대의 의료 마케팅 자동화 SaaS 입니다. ChatGPT · Gemini · Claude · Perplexity 가 클라이언트 병원을 추천하도록 GEO/AEO 최적화된 콘텐츠를 자동 생성합니다.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://wecircle.co.kr",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  shortlinkBase:
    process.env.NEXT_PUBLIC_SHORTLINK_BASE || "https://wecircle.co.kr/r",
  contact: {
    // Round 90 — 카톡채널/네이버플레이스는 새 회사 카톡 만들기 전까지 위서클 채널 활용
    kakao: "https://pf.kakao.com/_xnWQkG",
    naverPlace: "https://map.naver.com/p/search/%EB%A9%94%EB%94%94%EB%A7%B5/place/1091694610?c=15.00,0,0,0,dh&placePath=/home?bk_query=%EB%A9%94%EB%94%94%EB%A7%B5&entry=bmp&from=map&fromPanelNum=2&timestamp=202605242051&locale=ko&svcName=map_pcv5&searchText=%EB%A9%94%EB%94%94%EB%A7%B5",
    phone: process.env.NEXT_PUBLIC_PHONE || "02-0000-0000",
    medimapMain: "https://medi-map.co.kr",
    // Round 90 — wecircle 사업자 정보 (footer/about 표시)
    address: "서울특별시 서초구 사임당로 8길 13",
    businessNumber: "798-67-00527",
    email: "contact@wecircle.co.kr",
  },
  ga: process.env.NEXT_PUBLIC_GA_ID || "",
  gtm: process.env.NEXT_PUBLIC_GTM_ID || "",
  publisher: {
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    logo: "/wecircle-logo.svg",
  },
  // Round 90 — 콘텐츠 시리즈 컨셉 (사이트 안 "위서클 인사이트" 라벨 유지)
  contentBrand: "위서클 인사이트",
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
