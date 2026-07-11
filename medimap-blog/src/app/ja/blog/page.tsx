import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ブログ — WECIRCLE Global",
  description: "韓国での治療を検討する外国人患者向けの施術ガイドと情報。",
  alternates: {
    canonical: "/ja/blog",
    languages: { en: "/en/blog", ja: "/ja/blog", "zh-Hans": "/zh/blog" },
  },
};

export default async function JaBlogPage() {
  const cards = await getOverseasCards("ja", { kind: "blog" });
  return (
    <OverseasListing
      title="ブログ"
      subtitle="韓国での治療を検討する外国人患者向けの施術ガイドと情報。"
      cards={cards}
      hrefFor={(c) => `/ja/guides/${c.slug}`}
      empty="記事はまだありません。"
    />
  );
}
