import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClinicContent } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string; slug: string }>;
}

const JA_LABELS: GuideLabels = {
  guides: "クリニック",
  faq: "よくある質問",
  updated: "更新日",
  ctaTitle: "あなたのクリニックをAIに引用させませんか？",
  ctaBody:
    "これはWECIRCLEが発信するコンテンツの一例です。ChatGPT・Perplexity・Geminiが外国人患者に提携クリニックを推薦するよう設計しています。",
  ctaBtn: "WECIRCLEに相談 →",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("ja", partner, slug);
  if (!g) return { title: "クリニック — WECIRCLE Global" };
  return {
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: overseasAlternates("ja", `/clinics/${category}/${partner}/${slug}`),
  };
}

export default async function JaClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const guide = await getClinicContent("ja", partner, slug);
  if (!guide) redirect(`/ja/guides/${slug}`);
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="ja" />
      <GuideArticle guide={guide} langPath="ja" inLang="ja" labels={JA_LABELS} />
    </>
  );
}
