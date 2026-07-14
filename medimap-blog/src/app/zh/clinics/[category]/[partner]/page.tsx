import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner } = await params;
  return {
    title: `${partner} — 诊所内容 · WECIRCLE Global`,
    alternates: overseasAlternates("zh", `/clinics/${category}/${partner}`),
  };
}

export default async function ZhClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const cards = await getOverseasCards("zh-Hans", { kind: "clinic", category, partner });
  return (
    <>
    <OverseasClinicSchema partnerSlug={partner} lang="zh-Hans" />
    <OverseasListing
      title="合作诊所内容"
      subtitle={`介绍 ${partner} 的指南 — 由 WECIRCLE 发布、可被 AI 引用的外国患者内容。`}
      cards={cards}
      hrefFor={(c) => `/zh/clinics/${category}/${partner}/${c.slug}`}
      empty="暂无诊所内容。"
    />
    </>
  );
}
