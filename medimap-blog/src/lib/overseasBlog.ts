/**
 * 해외(en/ja/zh) 블로그 카테고리 — B2C·SEO/GEO 겨냥 편집 테마 축.
 * 국내 blog_category(content_marketing/ai_trend/hospital_marketing = B2B)와 별개.
 * generated_contents.blog_category 컬럼에 저장 (Migration: chk_blog_category 확장, 2026-07-14).
 *
 *   k_beauty  — K-뷰티의 우수성 (미용/피부 시술 우수성)
 *   k_medical — K-의료의 우수성 (안과·치과·내과 등 의료 우수성)
 *   k_tips    — K-의료·뷰티 이용 꿀팁 (병원 선택·비용·예약·방문 실용 가이드)
 */
export type OverseasBlogCategory = "k_beauty" | "k_medical" | "k_tips";

export const OVERSEAS_BLOG_CATEGORIES: OverseasBlogCategory[] = [
  "k_beauty",
  "k_medical",
  "k_tips",
];

// Round 159b (2026-08-16) — tw(대만·번체) 추가.
export type OverseasLang = "en" | "ja" | "zh" | "tw";

interface CatLabel {
  label: string;
  desc: string;
}

/** 언어별 카테고리 라벨 + 설명 (검색/GEO 키워드 반영). */
export const OVERSEAS_BLOG_LABELS: Record<
  OverseasLang,
  Record<OverseasBlogCategory, CatLabel>
> = {
  en: {
    k_beauty: {
      label: "K-Beauty Excellence",
      desc: "Why Korea leads in aesthetic and skin treatments.",
    },
    k_medical: {
      label: "K-Medical Excellence",
      desc: "Korea's strengths in eye, dental and specialist medicine.",
    },
    k_tips: {
      label: "K-Care Insider Tips",
      desc: "How to choose a clinic, costs, booking and your first visit.",
    },
  },
  ja: {
    k_beauty: {
      label: "K-ビューティーの実力",
      desc: "美容・スキン施術で韓国が選ばれる理由。",
    },
    k_medical: {
      label: "K-医療の実力",
      desc: "眼科・歯科など韓国医療の強み。",
    },
    k_tips: {
      label: "K-医療・美容 活用のコツ",
      desc: "クリニックの選び方・費用・予約・初診の流れ。",
    },
  },
  zh: {
    k_beauty: {
      label: "韩国美容的实力",
      desc: "韩国在医美与皮肤治疗领域的领先之处。",
    },
    k_medical: {
      label: "韩国医疗的实力",
      desc: "眼科、牙科等韩国专科医疗的优势。",
    },
    k_tips: {
      label: "韩国医美就诊攻略",
      desc: "如何选择诊所、费用、预约与首次就诊。",
    },
  },
  // Round 159b — 대만(번체). 대만 용어: 雷射(激光)·植牙(种植牙)·健檢(体检).
  tw: {
    k_beauty: {
      label: "韓國醫美的實力",
      desc: "韓國在醫美與皮膚治療領域的領先之處。",
    },
    k_medical: {
      label: "韓國醫療的實力",
      desc: "眼科、牙科等韓國專科醫療的優勢。",
    },
    k_tips: {
      label: "韓國醫美就診攻略",
      desc: "如何選擇診所、費用、預約與首次就診。",
    },
  },
};

export function isOverseasBlogCategory(v: string): v is OverseasBlogCategory {
  return (OVERSEAS_BLOG_CATEGORIES as string[]).includes(v);
}

export function overseasBlogLabel(
  lang: OverseasLang,
  cat: OverseasBlogCategory,
): CatLabel {
  return OVERSEAS_BLOG_LABELS[lang][cat];
}

/**
 * 자동 발행 파이프라인용 분류기 — 해외 비파트너 콘텐츠에 카테고리 부여.
 *   - 리스티클/병원 선택형(partnerCategory 있음 또는 keyword에 best/추천/おすすめ/推荐) → k_tips
 *   - 의료 진료과(eyeclinic/dental/internal/hair) → k_medical
 *   - 그 외(derma/plastic 미용 시술) → k_beauty
 */
export function classifyOverseasBlogCategory(opts: {
  keyword?: string | null;
  partnerCategory?: string | null;
  domainCategory?: string | null;
}): OverseasBlogCategory {
  const kw = (opts.keyword ?? "").toLowerCase();
  const isListicle =
    !!opts.partnerCategory ||
    /\bbest\b|추천|おすすめ|ランキング|推荐|攻略|how to choose/.test(kw);
  if (isListicle) return "k_tips";
  const medical = ["eyeclinic", "dental", "internal", "hair"];
  const dom = (opts.domainCategory ?? opts.partnerCategory ?? "").toLowerCase();
  if (medical.includes(dom) || /lasik|smile|implant|dental|screening|eye/.test(kw)) {
    return "k_medical";
  }
  return "k_beauty";
}
