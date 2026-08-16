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
  const name = overseasPartnerName(partner, "ja", info?.name ?? partner);
  return {
    title: `${name} — WECIRCLE Global`,
    alternates: overseasAlternates("ja", `/clinics/${category}/${partner}`),
  };
}

/** Round 150 — 인플랫폼 클리닉 프로필 (외부 홈페이지 링크 제거, en 미러). */
export default async function JaClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const [cards, info, gReviews] = await Promise.all([
    getOverseasCards("ja", { kind: "clinic", category, partner }),
    getPartnerBySlug(partner),
    getGoogleReviews(partner, 2), // Round 162 — 구글 리뷰 스니펫
  ]);
  const name = overseasPartnerName(partner, "ja", info?.name ?? partner);

  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="ja" />
      <ClinicProfile
        lang="ja"
        name={name}
        category={category}
        address={info?.address}
        cards={cards}
        hrefFor={(c) => `/ja/clinics/${category}/${partner}/${c.slug}`}
        nap={info ? <ClinicNAP lang="ja" clinic={info} reviews={gReviews} /> : null}
      />
    </>
  );
}
