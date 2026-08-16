import { getPartnerBySlug, overseasPartnerName } from "@/lib/guides";
import { JsonLd } from "@/components/JsonLd";

/** 진료과(한국어) → schema.org medicalSpecialty (영문). 매핑 없으면 생략. */
const SPECIALTY: Record<string, string> = {
  피부과: "Dermatology",
  안과: "Ophthalmology",
  성형외과: "PlasticSurgery",
  치과: "Dentistry",
  정형외과: "Orthopedic",
  산부인과: "Gynecologic",
  이비인후과: "Otolaryngologic",
};

/**
 * 해외 파트너 병원의 MedicalClinic JSON-LD.
 * AI/검색엔진이 병원을 "엔티티"로 인식하도록 이름·URL·주소·진료과를 구조화.
 * 서버 컴포넌트 — 파트너 slug 로 tenant 메타를 조회해 렌더.
 */
export async function OverseasClinicSchema({
  partnerSlug,
  lang,
}: {
  partnerSlug: string;
  lang: string;
}) {
  const info = await getPartnerBySlug(partnerSlug);
  if (!info) return null;

  const name = overseasPartnerName(partnerSlug, lang, info.name);
  const specialty = info.domain_category
    ? SPECIALTY[info.domain_category]
    : undefined;

  // Round 162 — 영문 NAP(GBP 일치) 우선: AI/검색이 지도 축 엔티티와 동일 표기로 매칭.
  const streetAddress = info.address_en ?? info.address;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: info.name_en ?? name,
    ...(info.name_en && info.name_en !== name ? { alternateName: name } : {}),
    areaServed: "KR",
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      addressRegion: "Seoul",
      ...(streetAddress ? { streetAddress } : {}),
    },
  };
  if (info.gmaps_url) data.hasMap = info.gmaps_url;
  if (info.homepage) data.url = info.homepage;
  if (info.phone) data.telephone = info.phone;
  if (specialty) data.medicalSpecialty = specialty;

  return <JsonLd data={data} />;
}
