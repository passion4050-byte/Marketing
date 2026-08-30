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
  const guide = await getGuide("en", slug);
  if (!guide) return { title: "Guide — WECIRCLE Global" };
  return {
    // 🔴 Round 180b (2026-08-30) — 해외 라우트에는 robots 가 아예 없었다.
    //   그래서 Round 178 의 해외 중복 noindex 처리는 전부 no-op 였다.
    //   페이지는 살려두고(follow: true) 색인만 뺀다. 되돌리려면 noindex=false.
    robots: guide.noindex ? { index: false, follow: true } : undefined,
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: {
      canonical: `/en/guides/${slug}`,
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

const EN_LABELS: GuideLabels = {
  guides: "Guides",
  faq: "Frequently asked questions",
  updated: "Updated",
  // Round 145c — 환자용 CTA (감사 #3: 환자 글이 B2B 피치로 끝나던 문제)
  ctaTitle: "Planning treatment in Korea?",
  ctaBody:
    "Message us with your questions. We help you compare clinics, get quotes and book. Free for you.",
  ctaBtn: "Get my free quote",
};

export default async function EnGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("en", slug);
  if (!guide) notFound();
  if (guide.is_partner && guide.partner_category && guide.partner_slug) {
    redirect(`/en/clinics/${guide.partner_category}/${guide.partner_slug}/${slug}`);
  }
  return <GuideArticle guide={guide} langPath="en" inLang="en" labels={EN_LABELS} />;
}
