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
  const guide = await getGuide("zh-Hans", slug);
  if (!guide) return { title: "指南 — WECIRCLE Global" };
  return {
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: {
      canonical: `/zh/guides/${slug}`,
      languages: {
        en: `/en/guides/${slug}`,
        ja: `/ja/guides/${slug}`,
        "zh-Hans": `/zh/guides/${slug}`,
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

const ZH_LABELS: GuideLabels = {
  guides: "指南",
  faq: "常见问题",
  updated: "更新于",
  ctaTitle: "想让您的诊所被AI引用吗？",
  ctaBody:
    "这是WECIRCLE发布的指南示例。我们让ChatGPT、Perplexity和Gemini向外国患者推荐合作诊所。",
  ctaBtn: "联系 WECIRCLE →",
};

export default async function ZhGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("zh-Hans", slug);
  if (!guide) notFound();
  if (guide.is_partner && guide.partner_category && guide.partner_slug) {
    redirect(`/zh/clinics/${guide.partner_category}/${guide.partner_slug}/${slug}`);
  }
  return <GuideArticle guide={guide} langPath="zh" inLang="zh-Hans" labels={ZH_LABELS} />;
}
