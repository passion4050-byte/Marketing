import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { organizationLd, websiteLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";
import { getAllPartnerPosts } from "@/lib/partners";
import { siteConfig } from "@/lib/site";

// Round 111 v3 (2026-07-02) — Editorial home. Off-white magazine cover style.
export const revalidate = 60;

const CATEGORY_OVERLINE: Record<string, string> = {
  content_marketing: "Content Marketing",
  ai_trend: "AI & Search",
  hospital_marketing: "Hospital Marketing",
};

export default async function HomePage() {
  const [blogPosts, partnerPosts] = await Promise.all([getAllPosts(), getAllPartnerPosts()]);
  const featured = blogPosts.find((p) => p.featured) ?? blogPosts[0];
  const secondary = blogPosts.filter((p) => p.slug !== featured?.slug).slice(0, 3);
  const totalPosts = blogPosts.length + partnerPosts.length;
  const today = new Date();

  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd data={websiteLd()} />

      <main className="bg-[#FAFAF7] text-stone-900">
        {/* === Masthead === */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 pt-14 pb-12 md:pt-20 md:pb-16 lg:px-10">
            {/* Meta bar */}
            <div className="flex items-baseline justify-between border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-6 bg-stone-400" />
                <span>WECIRCLE Insights · Issue {today.getFullYear() - 2000}</span>
              </div>
              <time dateTime={today.toISOString()} className="hidden tabular-nums md:inline">
                {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </time>
            </div>

            {/* Hero grid */}
            <div className="mt-8 grid gap-8 md:mt-12 md:gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              {/* Left — big statement */}
              <div>
                <h1 className="text-[32px] font-black leading-[1.1] tracking-[-0.02em] text-stone-950 sm:text-[38px] md:text-[54px] md:leading-[1.05] md:tracking-[-0.025em] xl:text-[62px]">
                  검색이 검색을 벗어난 시대,
                  <br />
                  <span className="font-serif italic font-normal text-stone-500">병원이 남기는 문장.</span>
                </h1>
                <p className="mt-6 max-w-xl text-[14px] leading-[1.75] text-stone-600 md:mt-8 md:text-[15px]">
                  위서클은 의료법을 통과한 병원 콘텐츠를 편집·발행합니다. 광고 트래픽이 아니라 AI 검색이 인용하는 신뢰 자산을 만듭니다.
                </p>

                {/* Editorial CTA row */}
                <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4">
                  <Link
                    href="/with-partners"
                    className="group inline-flex items-center gap-3 border border-stone-900 bg-stone-900 px-6 py-4 text-white transition hover:bg-stone-800"
                  >
                    <span className="text-sm font-bold tracking-tight">파트너 콘텐츠 아카이브</span>
                    <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/blog"
                    className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-stone-900 hover:text-stone-600"
                  >
                    Read the Insights
                    <ArrowUpRight size={14} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {/* Right — Featured cover */}
              {featured ? (
                <Link href={`/blog/${featured.slug}`} className="group block">
                  <div className="relative aspect-[16/11] w-full overflow-hidden bg-stone-200 sm:aspect-[3/2] md:aspect-[4/5]">
                    {featured.cover_image_url ? (
                      <Image
                        src={featured.cover_image_url}
                        alt={featured.cover_image_alt ?? featured.title}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover grayscale transition duration-[900ms] ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400">
                        <span className="text-[10px] font-bold uppercase tracking-widest">No cover</span>
                      </div>
                    )}
                    {/* Featured badge */}
                    <div className="absolute left-4 top-4 bg-stone-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-white">
                      Cover Story
                