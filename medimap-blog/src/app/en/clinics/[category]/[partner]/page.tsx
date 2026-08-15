import type { Metadata } from "next";
import { getOverseasCards, getPartnerBySlug, overseasPartnerName } from "@/lib/guides";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";
import { ClinicProfile } from "@/components/ClinicProfile";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string }>;
}

// Round 145d — 표시명 title (감사 #9: "dear — Clinic Content · ... · ..." raw slug 수정)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner } = await params;
  const info = await getPartnerBySlug(partner);
  const name = overseasPartnerName(partner, "en", info?.name ?? partner);
  return {
    title: `${name} — WECIRCLE Global`,
    alternates: overseasAlternates("en", `/clinics/${category}/${partner}`),
  };
}

/**
 * Round 150 — 인플랫폼 클리닉 프로필로 전환.
 * 외부 병원 홈페이지 링크 제거(전환 유출 차단), 병원 콘텐츠·상담(예약 요청)을
 * 이 페이지 안에서 소화. 콘텐츠 0 이어도 동일 프로필 렌더(여정 단절 없음).
 */
export default async function EnClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const [cards, info] = await Promise.all([
    getOverseasCards("en", { kind: "clinic", category, partner }),
    getPartnerBySlug(partner),
  ]);
  const name = overseasPartnerName(partner, "en", info?.name ?? partner);

  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="en" />
      <ClinicProfile
        lang="en"
        name={name}
        category={category}
        address={info?.address}
        cards={cards}
        hrefFor={(c) => `/en/clinics/${category}/${partner}/${c.slug}`}
      />
    </>
  );
}
