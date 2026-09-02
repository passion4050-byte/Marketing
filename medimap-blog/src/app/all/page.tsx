/**
 * Round 173 (2026-08-23) - HTML sitemap / crawl entry hub.
 *
 * Why this page exists
 *   GSC (2026-08-22): 175 indexed, 390 not indexed. 326 of the 390 sat in
 *   "Discovered - currently not indexed" - Google knew the URL from sitemap.xml but
 *   never spent a crawl on it. Only 22 were "Crawled - currently not indexed", so
 *   content quality was NOT the bottleneck; crawl budget and link depth were.
 *
 *   The site's deepest documents live at
 *   /with-partners/{category}/{partner}/{slug} - 4 clicks from the home page - and
 *   the legacy medical posts under /blog/{slug} had no hub at all (the /blog index
 *   only lists marketing-category posts). A sitemap entry is a hint; an internal
 *   link is a signal. This page turns every indexable URL into a depth-2 document
 *   by linking it from one page that the footer reaches on every route.
 *
 * Rules
 *   - noindex-flagged posts are excluded. Linking a page we ask Google not to index
 *     would spend the crawl budget this whole effort is trying to reclaim.
 *   - The page itself is indexable and follow: it is a legitimate directory, and its
 *     value to Google is precisely that it gets crawled.
 *   - Overseas locales link to their hubs only. Their detail pages already sit at
 *     depth 3 under /{lang}/clinics/... and duplicating ~120 more links here would
 *     dilute the signal this page is meant to concentrate.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { getAllPostsIncludingLegacy } from "@/lib/posts";
import {
  getAllPartnerPostMetas,
  PARTNER_CATEGORIES,
  type PartnerPostMeta,
} from "@/lib/partners";

// 1h - matches sitemap.ts. Publishing is daily, so hourly freshness is plenty and
// it keeps Googlebot off cold regenerations.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "전체 콘텐츠 | WECIRCLE",
  description:
    "위서클이 발행한 병원 마케팅 인사이트, 의료 정보 가이드, 파트너 병원 콘텐츠 전체 목록입니다.",
  alternates: { canonical: "/all" },
  openGraph: { title: "전체 콘텐츠 | WECIRCLE", type: "website" },
};

const MARKETING_CATEGORIES = new Set([
  "content_marketing",
  "ai_trend",
  "hospital_marketing",
]);

function fmt(d: string | undefined): string {
  if (!d) return "";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  return `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, "0")}.${String(
    t.getDate(),
  ).padStart(2, "0")}`;
}

export default async function AllContentPage() {
  const [posts, partnerPosts] = await Promise.all([
    getAllPostsIncludingLegacy().catch(() => []),
    getAllPartnerPostMetas().catch((): PartnerPostMeta[] => []),
  ]);

  // Round 173 - skip noindex-flagged posts and /blog URLs that only 308-redirect
  //   to a partner/overseas canonical (see PostMeta.canonicalPath).
  const live = posts.filter((p) => !p.noindex && !p.canonicalPath);
  const marketing = live.filter(
    (p) => p.blogCategory && MARKETING_CATEGORIES.has(p.blogCategory),
  );
  const guides = live.filter(
    (p) => !p.blogCategory || !MARKETING_CATEGORIES.has(p.blogCategory),
  );

  // category -> partner -> posts, ordered newest first inside each partner.
  const byCategory = new Map<string, Map<string, PartnerPostMeta[]>>();
  for (const p of partnerPosts) {
    if (p.noindex) continue;
    if (!byCategory.has(p.partner_category)) byCategory.set(p.partner_category, new Map());
    const partners = byCategory.get(p.partner_category)!;
    if (!partners.has(p.partner_slug)) partners.set(p.partner_slug, []);
    partners.get(p.partner_slug)!.push(p);
  }

  const partnerTotal = [...byCategory.values()].reduce(
    (n, m) => n + [...m.values()].reduce((k, arr) => k + arr.length, 0),
    0,
  );
  const total = marketing.length + guides.length + partnerTotal;

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "전체 콘텐츠", href: "/all" },
        ])}
      />

      <main className="bg-[#FAFAF7] text-stone-900">
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-10 md:pt-20 lg:px-10">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              <span className="inline-block h-px w-6 bg-stone-400" />
              Index
            </div>
            <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-[-0.02em] text-stone-950 md:text-[44px]">
              전체 콘텐츠
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-stone-600">
              위서클이 발행한 글 전체를 한 페이지에 모았습니다. 병원 마케팅 인사이트,
              의료 정보 가이드, 파트너 병원별 콘텐츠 순입니다.
            </p>
            <p className="mt-3 text-[13px] tabular-nums text-stone-500">
              총 {total}편 · 인사이트 {marketing.length} · 가이드 {guides.length} · 파트너{" "}
              {partnerTotal}
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1280px] px-6 py-14 lg:px-10">
          <Group
            title="병원 마케팅 인사이트"
            href="/blog"
            count={marketing.length}
            items={marketing.map((p) => ({
              href: `/blog/${p.slug}`,
              label: p.title,
              date: fmt(p.updated ?? p.date),
            }))}
          />

          <Group
            title="의료 정보 가이드"
            count={guides.length}
            items={guides.map((p) => ({
              href: `/blog/${p.slug}`,
              label: p.title,
              date: fmt(p.updated ?? p.date),
            }))}
          />

          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-[20px] font-bold tracking-[-0.01em] text-stone-950">
                파트너 병원 콘텐츠
              </h2>
              <Link
                href="/with-partners"
                className="text-[13px] text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline"
              >
                파트너 허브
              </Link>
            </div>

            {PARTNER_CATEGORIES.map((cat) => {
              const partners = byCategory.get(cat.slug);
              if (!partners || partners.size === 0) return null;
              return (
                <div key={cat.slug} className="mt-10">
                  <h3 className="text-[15px] font-semibold text-stone-900">
                    <Link
                      href={`/with-partners/${cat.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {cat.ko}
                    </Link>
                  </h3>
                  {[...partners.entries()].map(([partnerSlug, list]) => (
                    <div key={partnerSlug} className="mt-6 border-t border-stone-200 pt-4">
                      <Link
                        href={`/with-partners/${cat.slug}/${partnerSlug}`}
                        className="text-[14px] font-semibold text-stone-800 underline-offset-4 hover:underline"
                      >
                        {list[0]?.tenant_name ?? partnerSlug}
                        <span className="ml-2 text-[12px] font-normal tabular-nums text-stone-500">
                          {list.length}
                        </span>
                      </Link>
                      <ul className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2">
                        {list.map((p) => (
                          <li key={p.slug} className="flex items-baseline gap-3">
                            <Link
                              href={`/with-partners/${cat.slug}/${partnerSlug}/${p.slug}`}
                              className="text-[14px] leading-[1.6] text-stone-700 underline-offset-4 hover:text-stone-950 hover:underline"
                            >
                              {p.title}
                            </Link>
                            <span className="ml-auto shrink-0 text-[12px] tabular-nums text-stone-400">
                              {fmt(p.published_at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>

          <section className="mt-16 border-t border-stone-300 pt-8">
            <h2 className="text-[20px] font-bold tracking-[-0.01em] text-stone-950">
              Other languages
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {[
                { href: "/en", label: "English" },
                { href: "/ja", label: "日本語" },
                { href: "/zh", label: "简体中文" },
                { href: "/tw", label: "繁體中文" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-stone-700 underline-offset-4 hover:text-stone-950 hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}

function Group({
  title,
  href,
  count,
  items,
}: {
  title: string;
  href?: string;
  count: number;
  items: { href: string; label: string; date: string }[];
}) {
  if (count === 0) return null;
  return (
    <section className="mt-4 first:mt-0">
      <div className="flex items-baseline justify-between border-b border-stone-300 pb-4">
        <h2 className="text-[20px] font-bold tracking-[-0.01em] text-stone-950">
          {title}
          <span className="ml-3 text-[13px] font-normal tabular-nums text-stone-500">
            {count}
          </span>
        </h2>
        {href && (
          <Link
            href={href}
            className="text-[13px] text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline"
          >
            허브 보기
          </Link>
        )}
      </div>
      <ul className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">
        {items.map((it) => (
          <li key={it.href} className="flex items-baseline gap-3">
            <Link
              href={it.href}
              className="text-[14px] leading-[1.6] text-stone-700 underline-offset-4 hover:text-stone-950 hover:underline"
            >
              {it.label}
            </Link>
            <span className="ml-auto shrink-0 text-[12px] tabular-nums text-stone-400">
              {it.date}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
