import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { getAllPosts, BLOG_CATEGORIES } from "@/lib/posts";

// Round 111 v2 (2026-07-02) — Editorial magazine index. featured cover-forward hero,
// magazine index list, hairline dividers, warm off-white palette, tabular nums.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "위서클 인사이트",
  description:
    "위서클이 발행하는 병원 마케팅 인사이트. AI 검색 시대에 병원이 어떻게 살아남는지 다룹니다.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "위서클 인사이트", type: "website" },
};

const CATEGORY_OVERLINE: Record<string, string> = {
  content_marketing: "Content Marketing",
  ai_trend: "AI & Search",
  hospital_marketing: "Hospital Marketing",
};

const CATEGORY_KO: Record<string, string> = {
  content_marketing: "콘텐츠 마케팅",
  ai_trend: "AI · 마케팅 트렌드",
  hospital_marketing: "병원 마케팅 노하우",
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  const total = posts.length;
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.slug !== featured?.slug).slice(0, 12);

  const countByCategory = new Map<string, number>();
  for (const p of posts) {
    if (p.blogCategory) countByCategory.set(p.blogCategory, (countByCategory.get(p.blogCategory) ?? 0) + 1);
  }

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "블로그", href: "/blog" },
        ])}
      />

      <main className="bg-[#FAFAF7] text-stone-900">
        {/* === Masthead === */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 pt-16 pb-10 md:pt-20 md:pb-12 lg:px-10">
            <div className="flex items-baseline justify-between border-b border-stone-300 pb-6">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  <span className="inline-block h-px w-6 bg-stone-400" />
                  Wecircle Insights · Vol. {new Date().getFullYear() - 2000}
                </div>
                <div className="mt-2 font-serif text-2xl italic text-stone-800 md:text-3xl">
                  병원 마케팅을 다시 쓰는 시간
                </div>
              </div>
              <time className="hidden text-xs text-stone-500 tabular-nums md:block">
                {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </time>
            </div>

            {/* Featured cover-forward — magazine style */}
            {featured ? (
              <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-14">
                {/* Left — cover image */}
                <Link href={`/blog/${featured.slug}`} className="group block">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-200 sm:aspect-[3/2] md:aspect-[4/5]">
                    {featured.cover_image_url ? (
                      <Image
                        src={featured.cover_image_url}
                        alt={featured.cover_image_alt ?? featured.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 40vw"
                        priority
                        className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400">
                        <span className="text-[10px] font-bold uppercase tracking-widest">No cover</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Right — copy */}
                <div>
                  <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-900" />
                    Featured Story
                    {featured.blogCategory && (
                      <>
                        <span className="text-stone-300">/</span>
                        <span>{CATEGORY_OVERLINE[featured.blogCategory] ?? featured.blogCategory}</span>
                      </>
                    )}
                  </div>
                  <h1 className="mt-5 text-[26px] font-black leading-[1.15] tracking-[-0.02em] text-stone-950 sm:text-[32px] md:mt-6 md:text-[42px] xl:text-[52px]">
                    <Link href={`/blog/${featured.slug}`} className="transition hover:text-stone-700">
                      {featured.title}
                    </Link>
                  </h1>
                  {featured.description && (
                    <p className="mt-6 max-w-lg text-[15px] leading-[1.75] text-stone-600">
                      {featured.description}
                    </p>
                  )}
                  <div className="mt-8 flex items-center gap-6 border-t border-stone-200/80 pt-5 text-xs text-stone-500 tabular-nums">
                    <span>
                      {new Date(featured.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span>{featured.readingMinutes}분 읽기</span>
                    <span className="ml-auto">
                      <Link
                        href={`/blog/${featured.slug}`}
                        className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-900 hover:text-stone-600"
                      >
                        Read
                        <ArrowUpRight size={13} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-12 border border-dashed border-stone-200 bg-white p-16 text-center text-sm text-stone-500">
                신규 인사이트가 곧 발행됩니다.
              </div>
            )}
          </div>
        </section>

        {/* === Category rail (subtle chip navigation) === */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 py-8 lg:px-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                Sections
              </span>
              {BLOG_CATEGORIES.map((cat) => {
                const count = countByCategory.get(cat.slug) ?? 0;
                return (
                  <Link
                    key={cat.slug}
                    href={`/blog/category/${cat.slug}`}
                    className="group inline-flex items-center gap-2 border border-stone-300/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-800 transition hover:border-stone-900 hover:bg-stone-900 hover:text-white"
                  >
                    <span>{cat.ko}</span>
                    <span className="text-[10px] tabular-nums text-stone-400 transition group-hover:text-stone-300">
                      {String(count).padStart(2, "0")}
                    </span>
                  </Link>
                );
              })}
              <span className="ml-auto text-xs text-stone-500 tabular-nums">
                {total.toLocaleString()} stories
              </span>
            </div>
          </div>
        </section>

        {/* === Index list (magazine TOC) === */}
        {rest.length > 0 && (
          <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 py-16 md:py-20 lg:px-10">
            <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">
                Latest
              </h2>
              <span className="text-xs text-stone-500">시간 역순</span>
            </div>

            <ol className="divide-y divide-stone-200/70">
              {rest.map((p, i) => {
                const num = String(i + 1).padStart(2, "0");
                const overline = p.blogCategory ? CATEGORY_OVERLINE[p.blogCategory] ?? p.blogCategory : "Insights";
                return (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group grid grid-cols-[48px_1fr_auto] items-center gap-6 py-6 transition md:grid-cols-[64px_minmax(0,1fr)_minmax(0,180px)_auto] md:gap-10 md:py-8"
                    >
                      <span className="font-serif text-2xl font-light tabular-nums leading-none text-stone-400 transition group-hover:text-stone-900 md:text-3xl">
                        {num}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                          {overline}
                        </div>
                        <h3 className="mt-1.5 text-[17px] font-bold tracking-tight text-stone-950 transition group-hover:text-stone-700 md:text-[19px]">
                          {p.title}
                        </h3>
                        {p.description && (
                          <p className="mt-1.5 line-clamp-1 text-sm text-stone-500">
                            {p.description}
                          </p>
                        )}
                      </div>
                      <div className="hidden text-right text-xs text-stone-500 tabular-nums md:block">
                        <div>
                          {new Date(p.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        </div>
                        <div className="mt-0.5 text-stone-400">{p.readingMinutes} min</div>
                      </div>
                      <ArrowUpRight
                        size={18}
                        strokeWidth={1.5}
                        className="text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-900"
                      />
                 