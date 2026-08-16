import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getGuide } from "@/lib/guides";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide("ja", slug);
  if (!guide) return { title: "ガイド — WECIRCLE Global" };
  return {
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: {
      canonical: `/ja/guides/${slug}`,
      languages: {
        en: `/en/guides/${slug}`,
        ja: `/ja/guides/${slug}`,
        "zh-Hans": `/zh/guides/${slug}`, "zh-Hant": `/tw/guides/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.excerpt ?? undefined,
      images: guide.cover_image_url ? [guide.cover_image_url] : undefined,
    },
  };
}

const JA_LABELS: GuideLabels = {
  guides: "ガイド",
  faq: "よくある質問",
  updated: "更新日",
  // Round 145c — 환자용 CTA (감사 #5)
  ctaTitle: "韓国での施術をご検討中ですか？",
  ctaBody:
    "気になることをLINEでお聞かせください。クリニック比較・見積もり・予約まで、無料でお手伝いします。",
  ctaBtn: "WhatsApp",
};

export default async function JaGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("ja", slug);
  if (!guide) notFound();
  if (guide.is_partner && guide.partner_category && guide.partner_slug) {
    redirect(`/ja/clinics/${guide.partner_category}/${guide.partner_slug}/${slug}`);
  }
  return <GuideArticle guide={guide} langPath="ja" inLang="ja" labels={JA_LABELS} />;
}
