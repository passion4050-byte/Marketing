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
    // 🔴 Round 180b (2026-08-30) — 해외 라우트에는 robots 가 아예 없었다.
    //   그래서 Round 178 의 해외 중복 noindex 처리는 전부 no-op 였다.
    //   페이지는 살려두고(follow: true) 색인만 뺀다. 되돌리려면 noindex=false.
    robots: guide.noindex ? { index: false, follow: true } : undefined,
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: {
      canonical: `/zh/guides/${slug}`,
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

const ZH_LABELS: GuideLabels = {
  guides: "指南",
  faq: "常见问题",
  updated: "更新于",
  // Round 145c — 환자용 CTA
  ctaTitle: "正在考虑赴韩就医吗？",
  ctaBody: "欢迎咨询您关心的问题。我们协助您比较诊所、获取报价并完成预约，对您完全免费。",
  ctaBtn: "获取免费报价",
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
