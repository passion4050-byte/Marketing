import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClinicContent, getPartnerBySlug } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string; slug: string }>;
}

const TW_LABELS: GuideLabels = {
  guides: "診所",
  faq: "常見問題",
  updated: "更新於",
  ctaTitle: "對這家診所感興趣嗎？",
  ctaBody: "歡迎諮詢。我們協助您確認檔期、取得報價並完成預約，對您完全免費。",
  ctaBtn: "免費取得報價",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("zh-Hant", partner, slug);
  if (!g) return { title: "診所 — WECIRCLE Global" };
  return {
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: overseasAlternates("tw", `/clinics/${category}/${partner}/${slug}`),
  };
}

export default async function TwClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const [guide, clinic] = await Promise.all([
    getClinicContent("zh-Hant", partner, slug),
    getPartnerBySlug(partner), // Round 162 — NAP 카드용
  ]);
  if (!guide) redirect(`/tw/guides/${slug}`);
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="zh-Hant" />
      <GuideArticle guide={guide} langPath="tw" inLang="zh-Hant" labels={TW_LABELS} clinic={clinic} />
    </>
  );
}
