// Round 90 (2026-06-28) — wecircle 리브랜딩 (옵션 C 하이브리드).
//   사이트 브랜드 = WECIRCLE (새 운영사) / 콘텐츠 컨셉 = "위서클 인사이트" (카테고리 라벨) 유지.
//   사업자: 798-67-00527 · 서울 서초구 사임당로 8길 13 · 도메인 wecircle.co.kr.
//   카카오톡/연락처는 위서클 채널 당분간 그대로 (사용자 결정: 새 카톡은 추후).
export const siteConfig = {
  name: "WECIRCLE",
  brand: "WECIRCLE",
  tagline: "AI 검색 시대, 병원 마케팅을 다시 설계합니다",
  // Round 118 (2026-07-03) — 네이버 서치어드바이저 경고 해소: 사이트 설명/OG 설명
  // 80자 이내 권장. 기존 108자 → 72자로 축약 (브랜드 선두 + 핵심 키워드 유지).
  description:
    "위서클 — ChatGPT·Gemini·Perplexity 가 병원을 추천하도록 GEO/AEO 콘텐츠를 자동 생성하는 의료 마케팅 SaaS.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://wecircle.co.kr",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  shortlinkBase:
    process.env.NEXT_PUBLIC_SHORTLINK_BASE || "https://wecircle.co.kr/r",
  contact: {
    // Round 108-e (2026-07-03) — wecircle 오픈카톡 상담 채널 (국내용)
    // Round 145c (2026-08-14) — 카카오 채널 단일화 (감사 #14): 공식 채널 pf.kakao 로 통일.
    //   (기존 open.kakao 오픈채팅과 이원화돼 있던 것 정리. /r/k-* 숏링크 target 도 DB 에서 동기 변경.)
    kakao: "https://pf.kakao.com/_xnWQkG",
    // 해외(en/ja/zh)용 상담 채널.
    // 🔴 Round 146 — fallback 이 placeholder(https://line.me/)라서 env 미주입/ISR 스테일
    //   경로에서 **죽은 링크가 라이브에 노출**됐음(contact ×3 실측). fallback 자체를
    //   실계정으로 교체 — env 가 있으면 그 값, 없어도 절대 placeholder 가 안 나감.
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "https://wa.me/821083787555",
    line: process.env.NEXT_PUBLIC_LINE || "https://line.me/ti/p/~passion4050",
    naverPlace: "https://map.naver.com/p/search/%EB%A9%94%EB%94%94%EB%A7%B5/place/1091694610?c=15.00,0,0,0,dh&placePath=/home?bk_query=%EB%A9%94%EB%94%94%EB%A7%B5&entry=bmp&from=map&fromPanelNum=2&timestamp=202605242051&locale=ko&svcName=map_pcv5&searchText=%EB%A9%94%EB%94%94%EB%A7%B5",
    phone: process.env.NEXT_PUBLIC_PHONE || "02-0000-0000",
    medimapMain: "https://medi-map.co.kr",
    // Round 90 — wecircle 사업자 정보 (footer/about 표시)
    address: "서울특별시 서초구 사임당로 8길 13",
    businessNumber: "798-67-00527",
    email: "passion4050@gmail.com",
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
