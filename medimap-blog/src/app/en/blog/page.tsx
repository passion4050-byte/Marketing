import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — WECIRCLE Global",
  description: "K-beauty, K-medical excellence and insider tips for foreign patients considering care in Korea.",
  alternates: {
    canonical: "/en/blog",
    languages: { en: "/en/blog", ja: "/ja/blog", "zh-Hans": "/zh/blog", "zh-Hant": "/tw/blog" },
  },
};

export default async function EnBlogPage() {
  const cards = await getOverseasCards("en", { kind: "blog" });
  return (
    <OverseasBlogIndex
      lang="en"
      title="Blog"
      subtitle="K-beauty, K-medical excellence and insider tips for foreign patients considering care in Korea."
      cards={cards}
      sectionsLabel="Sections"
      storiesLabel={(n) => `${n} stories`}
    />
  );
}
