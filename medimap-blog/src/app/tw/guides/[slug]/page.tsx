import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getGuide } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide("zh-Hant", slug);
  if (!guide) return { title: "攻略 — WECIRCLE Global" };
  return {
    // 🔴 Round 180b (2026-08-30) — 해외 라우트에는 robots 가 아예 없었다.
    //   그래서 Round 178 의 해외 중복 noindex 처리는 전부 no-op 였다.
    //   페이지는 살려두고(follow: true) 색인만 뺀다. 되돌리려면 noindex=false.
    robots: guide.noindex ? { index: false, follow: true } : undefined,
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: overseasAlternates("tw", `/guides/${slug}`),
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.excerpt ?? undefined,
      images: guide.cover_image_url ? [guide.cover_image_url] : undefined,
    },
  };
}

const TW_LABELS: GuideLabels = {
  guides: "攻略",
  faq: "常見問題",
  updated: "更新於",
  ctaTitle: "正在考慮赴韓就醫嗎？",
  ctaBody: "歡迎諮詢您關心的問題。我們協助您比較診所、取得報價並完成預約，對您完全免費。",
  ctaBtn: "免費取得報價",
};

export default async function TwGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("zh-Hant", slug);
  if (!guide) notFound();
  if (guide.is_partner && guide.partner_category && guide.partner_slug) {
    redirect(`/tw/clinics/${guide.partner_category}/${guide.partner_slug}/${slug}`);
  }
  return <GuideArticle guide={guide} langPath="tw" inLang="zh-Hant" labels={TW_LABELS} />;
}
