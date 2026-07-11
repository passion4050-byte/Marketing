import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    alternates: { canonical: `/ja/guides/${slug}` },
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
  ctaTitle: "あなたのクリニックをAIに引用させませんか？",
  ctaBody:
    "これはWECIRCLEが発信するガイドの一例です。ChatGPT・Perplexity・Geminiが外国人患者に提携クリニックを推薦するよう設計しています。",
  ctaBtn: "WECIRCLEに相談 →",
};

export default async function JaGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("ja", slug);
  if (!guide) notFound();
  return <GuideArticle guide={guide} langPath="ja" inLang="ja" labels={JA_LABELS} />;
}
