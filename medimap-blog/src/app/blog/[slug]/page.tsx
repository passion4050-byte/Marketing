import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { Clock, ChevronRight } from "lucide-react";

import { CTABlock } from "@/components/CTABlock";
import { FAQAccordion } from "@/components/FAQAccordion";
import { JsonLd } from "@/components/JsonLd";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { RelatedPosts } from "@/components/RelatedPosts";
import {
  articleLd,
  breadcrumbLd,
  faqPageLd,
  medicalWebPageLd,
} from "@/lib/schema";
import { getAllPostSlugs, getAllPosts, getPostBySlug } from "@/lib/posts";

export const dynamicParams = false;
export const revalidate = false;

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
  const slugs = await getAllPostSlugs();
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

function readingTime(source: string): number {
  const words = source.replace(/\s+/g, " ").trim().length;
  // Korean prose: ~600 chars/min for fluent readers, clamp to 2 min minimum.
  return Math.max(2, Math.round(words / 600));
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const allPosts = await getAllPosts();
  const minutes = readingTime(post.source);

  const { content } = await compileMDX({
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

            <div className="mx-auto mt-10 prose-medimap">{content}</div>

            {post.faq && post.faq.length > 0 && (
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

        <RelatedPosts posts={allPosts} currentSlug={post.slug} />
      </div>
    </>
  );
}
