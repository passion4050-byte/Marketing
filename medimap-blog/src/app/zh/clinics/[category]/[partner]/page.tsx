import type { Metadata } from "next";
import { getGoogleReviews, getOverseasCards, getPartnerBySlug, overseasPartnerName } from "@/lib/guides";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";
import { ClinicProfile } from "@/components/ClinicProfile";
import { ClinicNAP } from "@/components/ClinicNAP";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner } = await params;
  const info = await getPartnerBySlug(partner);
  const name = overseasPartnerName(partner, "zh", info?.name ?? partner);
  return {
    title: `${name} — WECIRCLE Global`,
    alternates: overseasAlternates("zh", `/clinics/${category}/${partner}`),
  };
}

/** Round 150 — 인플랫폼 클리닉 프로필 (외부 홈페이지 링크 제거, en 미러). */
export default async function ZhClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const [cards, info, gReviews] = await Promise.all([
    getOverseasCards("zh", { kind: "clinic", category, partner }),
    getPartnerBySlug(partner),
    getGoogleReviews(partner, 2), // Round 162 — 구글 리뷰 스니펫
  ]);
  const name = overseasPartnerName(partner, "zh", info?.name ?? partner);

  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="zh" />
      <ClinicProfile
        lang="zh"
        name={name}
        category={category}
        address={info?.address}
        cards={cards}
        hrefFor={(c) => `/zh/clinics/${category}/${partner}/${c.slug}`}
        nap={info ? <ClinicNAP lang="zh" clinic={info} reviews={gReviews} /> : null}
      />
    </>
  );
}
