import type { GoogleReviewSnippet, PartnerClinicInfo } from "@/lib/guides";

/**
 * Round 162 (2026-08-16) — 클리닉 NAP 카드 (지도 축 ↔ 텍스트 축 연결).
 *
 * 배경(경쟁사 growly 분석): Gemini 'Grounding with Google Maps' 는 GBP(장소)를
 * 직접 조회한다. 우리 콘텐츠가 지도 축에 기여하려면 병원의 영문 NAP(이름·주소·
 * 전화)가 GBP 표기와 "글자 단위"로 일치하는 인용(citation)이 웹에 쌓여야 한다.
 * 이 카드는 클라이언트 메뉴(tenants.name_en/address_en/...)에 입력된 GBP 일치
 * 데이터를 모든 파트너 콘텐츠·프로필에 항상 렌더한다 — LLM 생성이 아니라
 * DB 원본이라 표기 흔들림이 없다 (사용자 지시: "각 콘텐츠에 항상 같이 보여지게").
 *
 * 렌더 조건: address_en 또는 gmaps_url 이 있을 때만. (미입력 병원 = 렌더 안 함, 무회귀)
 * 리뷰 별점은 구글 실측 집계(자체 측정 아님) — schema.org aggregateRating 으로는
 * 마크업하지 않는다(제3자 출처 self-serving 마크업은 구글 가이드라인 위반).
 */

type Lang = "en" | "ja" | "zh" | "tw";

const L: Record<
  Lang,
  {
    overline: string;
    gettingThere: string;
    reviews: (n: string) => string;
    onGoogle: string;
    openMaps: string;
    phone: string;
    note: string;
  }
> = {
  en: {
    overline: "Clinic Information",
    gettingThere: "Getting there",
    reviews: (n) => `${n} Google reviews`,
    onGoogle: "on Google Maps",
    openMaps: "Open in Google Maps",
    phone: "Phone",
    note: "Name and address are written exactly as they appear on Google Maps.",
  },
  ja: {
    overline: "クリニック情報",
    gettingThere: "アクセス",
    reviews: (n) => `Googleレビュー${n}件`,
    onGoogle: "Google マップ",
    openMaps: "Google マップで開く",
    phone: "電話",
    note: "名称・住所は Google マップの表記と同一です。",
  },
  zh: {
    overline: "诊所信息",
    gettingThere: "交通指南",
    reviews: (n) => `${n}条Google评价`,
    onGoogle: "Google 地图",
    openMaps: "在 Google 地图中打开",
    phone: "电话",
    note: "名称与地址与 Google 地图上的标注完全一致。",
  },
  tw: {
    overline: "診所資訊",
    gettingThere: "交通指南",
    reviews: (n) => `${n}則Google評論`,
    onGoogle: "Google 地圖",
    openMaps: "在 Google 地圖中開啟",
    phone: "電話",
    note: "名稱與地址與 Google 地圖上的標註完全一致。",
  },
};

function fmtCount(n: number): string {
  if (n >= 1000) {
    const k = Math.floor(n / 100) / 10;
    return `${k.toFixed(k % 1 === 0 ? 0 : 1)}K+`;
  }
  return String(n);
}

export function ClinicNAP({
  lang,
  clinic,
  reviews,
}: {
  lang: Lang;
  clinic: PartnerClinicInfo;
  /** Round 162 — 구글 리뷰 스니펫(공식 API 동기화분). 있으면 짧은 인용으로 렌더. */
  reviews?: GoogleReviewSnippet[];
}) {
  if (!clinic.address_en && !clinic.gmaps_url) return null;
  const t = L[lang] ?? L.en;
  const displayName = clinic.name_en ?? clinic.name;
  const rating = clinic.google_rating;
  const count = clinic.google_review_count;

  return (
    <aside className="mt-10 border border-stone-300 bg-white">
      <div className="border-b border-stone-200 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            {t.overline}
          </span>
          {rating != null && count != null && clinic.gmaps_url ? (
            <a
              href={clinic.gmaps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-stone-900 hover:underline hover:underline-offset-4"
            >
              ★ {rating.toFixed(1)} · {t.reviews(fmtCount(count))}{" "}
              <span className="font-medium text-stone-500">({t.onGoogle})</span>
            </a>
          ) : null}
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="text-base font-black tracking-tight text-stone-950">{displayName}</div>
        {clinic.address_en ? (
          <p className="mt-1 text-sm leading-relaxed text-stone-700">{clinic.address_en}</p>
        ) : null}
        {clinic.transit_en ? (
          <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
            <span className="font-bold text-stone-800">{t.gettingThere}: </span>
            {clinic.transit_en}
          </p>
        ) : null}
        {clinic.phone ? (
          <p className="mt-1 text-[13px] text-stone-600">
            <span className="font-bold text-stone-800">{t.phone}: </span>
            {clinic.phone}
          </p>
        ) : null}
        {reviews && reviews.length > 0 ? (
          <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
            {reviews.map((r) => (
              <blockquote key={`${r.author}-${r.publish_time}`} className="text-[13px] leading-relaxed text-stone-600">
                “{r.body.length > 220 ? `${r.body.slice(0, 220)}…` : r.body}”
                <cite className="mt-1 block text-[11px] not-italic text-stone-400">
                  — {r.author}
                  {r.rating != null ? ` · ★ ${r.rating.toFixed(1)}` : ""} · Google
                </cite>
              </blockquote>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {clinic.gmaps_url ? (
            <a
              href={clinic.gmaps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-stone-900 px-4 py-2 text-[12px] font-bold text-stone-900 transition hover:bg-stone-900 hover:text-white"
            >
              {t.openMaps}
            </a>
          ) : null}
          <span className="text-[11px] text-stone-400">{t.note}</span>
        </div>
      </div>
    </aside>
  );
}
