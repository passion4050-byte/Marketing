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
  const name = overseasPartnerName(partner, "zh-Hant", info?.name ?? partner);
  return {
    title: `${name} — WECIRCLE Global`,
    alternates: overseasAlternates("tw", `/clinics/${category}/${partner}`),
  };
}

/** Round 159b — 인플랫폼 클리닉 프로필 (zh 미러, 번체). */
export default async function TwClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const [cards, info, gReviews] = await Promise.all([
    getOverseasCards("zh-Hant", { kind: "clinic", category, partner }),
    getPartnerBySlug(partner),
    getGoogleReviews(partner, 2), // Round 162 — 구글 리뷰 스니펫
  ]);
  const name = overseasPartnerName(partner, "zh-Hant", info?.name ?? partner);

  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="zh-Hant" />
      <ClinicProfile
        lang="tw"
        name={name}
        category={category}
        address={info?.address}
        cards={cards}
        hrefFor={(c) => `/tw/clinics/${category}/${partner}/${c.slug}`}
        nap={info ? <ClinicNAP lang="tw" clinic={info} reviews={gReviews} /> : null}
      />
    </>
  );
}
