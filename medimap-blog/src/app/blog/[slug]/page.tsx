import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { Clock, ChevronRight } from "lucide-react";

import dynamic from "next/dynamic";
import { CTABlock } from "@/components/CTABlock";
import { FAQAccordion } from "@/components/FAQAccordion";
import { JsonLd } from "@/components/JsonLd";
import { RelatedPosts } from "@/components/RelatedPosts";

// Defer client-only widgets until after hydration so they don't compete with
// the LCP element (the article hero <p>) for main-thread time.
const ReadingProgress = dynamic(
  () => import("@/components/ReadingProgress").then((m) => m.ReadingProgress),
  { ssr: false },
);
const TableOfContents = dynamic(
  () => import("@/components/TableOfContents").then((m) => m.TableOfContents),
  { ssr: false },
);
import {
  articleLd,
  breadcrumbLd,
  faqPageLd,
  medicalWebPageLd,
} from "@/lib/schema";
import { getAllPostSlugs, getAllPosts, getPostBySlug } from "@/lib/posts";

// DB 자동 발행 글은 빌드 시점에 알 수 없음 → on-demand SSG 허용
export const dynamicParams = true;
// 60초 ISR — 새 자동 발행 글이 1분 내 반영. 캐시 부담 최소.
export const revalidate = 60;

const mdxComponents = {
  CTABlock,
  FAQAccordion,
  a: ({ href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    href?.startsWith("/") ? (
      <Link href={href} {...rest} />
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest} />
    ),
};

export async function generateStaticParams() {
  // 2026-05-24: DB slug 들은 빌드타임 prerender 에서 제외 — pooler hang 회피.
  // dynamicParams=true 와 revalidate=60 으로 첫 요청 시 SSR + 60초 ISR.
  // mdx 글만 빌드 시 prerender. 자동 발행 DB 글은 첫 방문자 살짝 느림 (수백 ms).
  const { getMdxOnlySlugs } = await import("@/lib/posts");
  const slugs = await getMdxOnlySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "글을 찾을 수 없습니다" };
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const allPosts = await getAllPosts();
  const minutes = post.readingMinutes;

  // DB 자동 발행 글은 generator 가 만든 HTML 을 그대로 노출 — 의료법 린터 통과한
  // 자기 콘텐츠라 XSS 위험 없음. mdx 글은 기존 compileMDX 파이프라인 유지.
  const heroImage = post.cover_image_url ? (
    <figure className="post-hero -mt-4 mb-8 overflow-hidden rounded-card border border-line/70 bg-surface-alt">
      <img
        src={post.cover_image_url}
        alt={post.cover_image_alt ?? post.title}
        className="w-full h-auto aspect-[16/9] object-cover"
        loading="eager"
        decoding="async"
      />
      {(post.coverCredit || post.cover_image_alt) && (
        <figcaption className="px-4 py-2 text-[11.5px] text-ink-subtle">
          {post.coverCredit ? (
            <>
              Photo by{" "}
              <a
                href={post.coverCredit.url}
                target="_blank"
                rel="noopener nofollow"
                className="underline hover:text-ink"
              >
                {post.coverCredit.author}
              </a>{" "}
              on{" "}
              <a
                href="https://unsplash.com/?utm_source=medimap&utm_medium=referral"
                target="_blank"
                rel="noopener nofollow"
                className="underline hover:text-ink"
              >
                Unsplash
              </a>
            </>
          ) : (
            post.cover_image_alt
          )}
        </figcaption>
      )}
    </figure>
  ) : null;

  let content: React.ReactNode;
  if (post.source_type === "html") {
    content = (
      <div
        className="db-html-content"
        dangerouslySetInnerHTML={{ __html: post.source }}
      />
    );
  } else {
    const compiled = await compileMDX({
      source: post.source,
      components: mdxComponents,
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              { behavior: "wrap", properties: { className: ["heading-anchor"] } },
            ],
          ],
        },
      },
    });
    content = compiled.content;
  }

  return (
    <>
      <ReadingProgress />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "블로그", href: "/blog" },
          { name: post.title, href: `/blog/${post.slug}` },
        ])}
      />
      <JsonLd data={articleLd(post)} />
      <JsonLd data={medicalWebPageLd(post)} />
      <JsonLd data={faqPageLd(post.faq ?? [])} />

      <div className="container-content py-10 md:py-14">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-ink-subtle"
        >
          <Link href="/" className="hover:text-brand">
            홈
          </Link>
          <ChevronRight size={14} className="text-ink-subtle/60" />
          <Link href="/blog" className="hover:text-brand">
            블로그
          </Link>
          <ChevronRight size={14} className="text-ink-subtle/60" />
          <span className="line-clamp-1 text-ink-muted">{post.title}</span>
        </nav>

        <div className="mt-8 grid gap-12 xl:grid-cols-[minmax(0,1fr)_240px]">
          <article className="min-w-0 animate-fade-in-up">
            <header className="mx-auto max-w-prose">
              <div className="flex flex-wrap items-center gap-2">
                {post.category && (
                  <span className="pill-label">{post.category}</span>
                )}
                {post.reviewedBy && (
                  <span className="pill-tag border-brand-100 bg-brand-50 text-brand-700">
                    의료진 검수: {post.reviewedBy}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-[36px] font-extrabold leading-[1.15] tracking-[-0.025em] balance-text md:text-[48px]">
                {post.title}
              </h1>
              <p className="mt-5 text-[18px] leading-[1.7] text-ink-muted pretty-text">
                {post.description}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-line/70 py-4 text-sm text-ink-subtle">
                {post.author && (
                  <span className="font-semibold text-ink-muted">
                    {post.author}
                  </span>
                )}
                <span className="meta-divider" />
                <time dateTime={post.date} className="num">
                  {post.date}
                </time>
                <span className="meta-divider" />
                <span className="pill-stat">
                  <Clock size={14} />
                  {minutes}분 분량
                </span>
                {post.tags && post.tags.length > 0 && (
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 4).map((t) => (
                      <span key={t} className="pill-tag">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </header>

            <div className="mx-auto mt-10 prose-medimap">{heroImage}
          {content}</div>

            {/* Round 81 — DB 자동발행 글(html)은 본문 H2 가 이미 질문형이라 시각 FAQ 섹션 중복 →
                MDX 글만 시각 노출. FAQPage 스키마(faqPageLd)는 두 경우 모두 발동(AEO). */}
            {post.source_type !== "html" && post.faq && post.faq.length > 0 && (
              <section className="mx-auto mt-14 max-w-prose">
                <h2 id="faq" className="text-2xl font-bold tracking-tight">
                  자주 묻는 질문
                </h2>
                <p className="mt-2 text-sm text-ink-subtle">
                  본 콘텐츠는 의료법 가이드 검수를 마쳤습니다.
                </p>
                <FAQAccordion items={post.faq} />
              </section>
            )}

            <div className="mx-auto max-w-prose">
              <CTABlock utmSource="blog" utmCampaign={`blog_${post.slug}`} />
            </div>
          </article>

          <TableOfContents />
        </div>

        <RelatedPosts posts={allPosts} currentSlug={post.slug} currentCategory={post.blogCategory} />
      </div>
    </>
  );
}
