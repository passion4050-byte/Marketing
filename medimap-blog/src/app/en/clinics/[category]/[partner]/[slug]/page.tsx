import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClinicContent, getGoogleReviews, getPartnerBySlug } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string; slug: string }>;
}

const EN_LABELS: GuideLabels = {
  guides: "Clinics",
  faq: "Frequently asked questions",
  updated: "Updated",
  ctaTitle: "Interested in this clinic?",
  ctaBody:
    "Message us with your questions. We help you check availability, get a quote and book. Free for you.",
  ctaBtn: "Get my free quote",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("en", partner, slug);
  if (!g) return { title: "Clinic — WECIRCLE Global" };
  return {
    // 🔴 Round 180b (2026-08-30) — 해외 라우트에는 robots 가 아예 없었다.
    //   그래서 Round 178 의 해외 중복 noindex 처리는 전부 no-op 였다.
    //   페이지는 살려두고(follow: true) 색인만 뺀다. 되돌리려면 noindex=false.
    robots: g.noindex ? { index: false, follow: true } : undefined,
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: overseasAlternates("en", `/clinics/${category}/${partner}/${g.slug}`),
  };
}

export default async function EnClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const [guide, clinic, gReviews] = await Promise.all([
    getClinicContent("en", partner, slug),
    getPartnerBySlug(partner), // Round 162 — NAP 카드용
    getGoogleReviews(partner, 2), // Round 162b — 글 상세 리뷰 인용
  ]);
  if (!guide) redirect(`/en/guides/${slug}`);
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="en" />
      <GuideArticle guide={guide} langPath="en" inLang="en" labels={EN_LABELS} clinic={clinic} reviews={gReviews} />
    </>
  );
}
