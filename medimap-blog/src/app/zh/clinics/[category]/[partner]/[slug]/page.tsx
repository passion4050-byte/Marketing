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

const ZH_LABELS: GuideLabels = {
  guides: "诊所",
  faq: "常见问题",
  updated: "更新于",
  ctaTitle: "对这家诊所感兴趣吗？",
  ctaBody: "欢迎咨询。我们协助您确认档期、获取报价并完成预约，对您完全免费。",
  ctaBtn: "获取免费报价",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("zh-Hans", partner, slug);
  if (!g) return { title: "诊所 — WECIRCLE Global" };
  return {
    // 🔴 Round 180b (2026-08-30) — 해외 라우트에는 robots 가 아예 없었다.
    //   그래서 Round 178 의 해외 중복 noindex 처리는 전부 no-op 였다.
    //   페이지는 살려두고(follow: true) 색인만 뺀다. 되돌리려면 noindex=false.
    robots: g.noindex ? { index: false, follow: true } : undefined,
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: overseasAlternates("zh", `/clinics/${category}/${partner}/${g.slug}`),
  };
}

export default async function ZhClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const [guide, clinic, gReviews] = await Promise.all([
    getClinicContent("zh-Hans", partner, slug),
    getPartnerBySlug(partner), // Round 162 — NAP 카드용
    getGoogleReviews(partner, 2), // Round 162b — 글 상세 리뷰 인용
  ]);
  if (!guide) redirect(`/zh/guides/${slug}`);
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="zh-Hans" />
      <GuideArticle guide={guide} langPath="zh" inLang="zh-Hans" labels={ZH_LABELS} clinic={clinic} reviews={gReviews} />
    </>
  );
}
