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

const ZH_LABELS: GuideLabels = {
  guides: "诊所",
  faq: "常见问题",
  updated: "更新于",
  ctaTitle: "对这家诊所感兴趣吗？",
  ctaBody: "欢迎咨询。我们协助您确认档期、获取报价并完成预约，对您完全免费。",
  ctaBtn: "立即咨询",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("zh-Hans", partner, slug);
  if (!g) return { title: "诊所 — WECIRCLE Global" };
  return {
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: overseasAlternates("zh", `/clinics/${category}/${partner}/${slug}`),
  };
}

export default async function ZhClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const guide = await getClinicContent("zh-Hans", partner, slug);
  if (!guide) redirect(`/zh/guides/${slug}`);
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="zh-Hans" />
      <GuideArticle guide={guide} langPath="zh" inLang="zh-Hans" labels={ZH_LABELS} />
    </>
  );
}
