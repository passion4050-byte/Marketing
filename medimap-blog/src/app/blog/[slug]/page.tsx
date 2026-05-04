import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import { CTABlock } from "@/components/CTABlock";
import { FAQAccordion } from "@/components/FAQAccordion";
import { JsonLd } from "@/components/JsonLd";
import {
  articleLd,
  breadcrumbLd,
  faqPageLd,
  medicalWebPageLd,
} from "@/lib/schema";
import { getAllPostSlugs, getPostBySlug } from "@/lib/posts";

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

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

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

      <article className="container-content py-12 md:py-20">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-subtle">
          <Link href="/" className="hover:text-brand">홈</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-brand">블로그</Link>
          <span className="mx-2">/</span>
          <span className="text-ink-muted">{post.title}</span>
        </nav>

        <header className="mx-auto mt-6 max-w-prose">
          {post.category && <span className="pill-label">{post.category}</span>}
          <h1 className="mt-4 text-display-md md:text-display-lg">{post.title}</h1>
          <p className="mt-4 text-lg text-ink-muted">{post.description}</p>
          <div className="mt-6 flex items-center gap-3 text-sm text-ink-subtle">
            {post.author && <span>{post.author}</span>}
            <time dateTime={post.date}>{post.date}</time>
            {post.reviewedBy && (
              <span className="rounded-pill bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                의료진 검수: {post.reviewedBy}
              </span>
            )}
          </div>
        </header>

        <div className="mx-auto mt-10 prose-medimap">{content}</div>

        {post.faq && post.faq.length > 0 && (
          <section className="mx-auto mt-12 max-w-prose">
            <h2 className="text-2xl font-bold tracking-tight">자주 묻는 질문</h2>
            <FAQAccordion items={post.faq} />
          </section>
        )}

        <div className="mx-auto max-w-prose">
          <CTABlock utmSource="blog" utmCampaign={`blog_${post.slug}`} />
        </div>
      </article>
    </>
  );
}
