import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClinicContent } from "@/lib/guides";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string; slug: string }>;
}

const ZH_LABELS: GuideLabels = {
  guides: "诊所",
  faq: "常见问题",
  updated: "更新于",
  ctaTitle: "想让您的诊所被AI引用吗？",
  ctaBody:
    "这是WECIRCLE发布的内容示例。我们让ChatGPT、Perplexity和Gemini向外国患者推荐合作诊所。",
  ctaBtn: "联系 WECIRCLE →",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("zh-Hans", partner, slug);
  if (!g) return { title: "诊所 — WECIRCLE Global" };
  return {
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: { canonical: `/zh/clinics/${category}/${partner}/${slug}` },
  };
}

export default async function ZhClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const guide = await getClinicContent("zh-Hans", partner, slug);
  if (!guide) notFound();
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="zh-Hans" />
      <GuideArticle guide={guide} langPath="zh" inLang="zh-Hans" labels={ZH_LABELS} />
    </>
  );
}
