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
import { PARTNER_CATEGORIES, getAllPartnerPosts } from "@/lib/partners";

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

// Round 143b — 본문 첫 <h1> 텍스트(서술형 헤드라인) 추출. title 필드가 stub 인 자동발행
//   글의 <title>/og:title 을 서술형으로 교정하는 데 사용(generateMetadata 공용).
function firstH1Text(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return (
    m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s*\|\s*위서클\s*$/, "")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

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
  const displayTitle =
    post.source_type === "html" ? firstH1Text(post.source) || post.title : post.title;
  return {
    title: displayTitle,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: displayTitle,
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

  // Round 109-B (2026-07-03) — 자사 blog 카테고리 → 파트너 카테고리 자동 매핑.
  // wecircle 내부 순환 극대화: 자사 콘텐츠 하단에 관련 파트너 병원 콘텐츠 카드.
  const _blogToPartnerCategoryMap: Record<string, string[]> = {
    "안과": ["eyeclinic"],
    "eyeclinic": ["eyeclinic"],
    "피부과": ["derma"],
    "derma": ["derma"],
    "성형외과": ["plastic"],
    "plastic": ["plastic"],
    "치과": ["dental"],
    "dental": ["dental"],
    "내과": ["internal"],
    "internal": ["internal"],
    "모발이식": ["hair"],
    "hair": ["hair"],
    "한방의원": ["oriental"],
    "oriental": ["oriental"],
    // fallback: 카테고리 매칭 안 되면 안과+피부과 (인기 카테고리)
    "": ["eyeclinic", "derma"],
    "medimap-self": ["eyeclinic", "derma", "hair"],
    "자사인사이트": ["eyeclinic", "derma", "hair"],
  };
  const blogCat = (post.blogCategory || post.category || "").trim();
  const targetPartnerCats = _blogToPartnerCategoryMap[blogCat] || ["eyeclinic", "derma"];

  const allPartnerPosts = await getAllPartnerPosts().catch(() => []);
  const relatedPartnerPosts = allPartnerPosts
    .filter((p) => targetPartnerCats.includes(p.partner_category))
    .sort(() => Math.random() - 0.5) // 매번 다른 4편 노출 (다양성)
    .slice(0, 6);

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

  // Round 108-e (2026-07-03) — 본문 안 "참고 자료" (외부 URL) 제거 정책.
  // sitewide 내부 유도: 사용자가 외부 사이트로 이탈하지 않도록 참고 자료 섹션 제거.
  const stripReferenceSection = (html: string): string => {
    if (!html) return html;
    let out = html;
    // "참고 자료" / "참고자료" / "References" H2 이후 전부 제거
    out = out.replace(/<h2[^>]*>\s*참고\s*자료\s*<\/h2>[\s\S]*$/i, "");
    out = out.replace(/<h2[^>]*>\s*References?\s*<\/h2>[\s\S]*$/i, "");
    out = out.replace(/<h2[^>]*>\s*참고\s*문헌\s*<\/h2>[\s\S]*$/i, "");
    // 홈페이지 / 네이버 지도 링크 문단 자동 제거
    out = out.replace(
      /<p[^>]*>\s*(?:홈페이지|네이버\s*지도|웹사이트|사이트)[^<]*<\/p>/gi,
      "",
    );
    return out;
  };

  // Round 143b (SEO 감사 ②) — 본문 첫 <h1>을 기사 헤드라인으로 승격.
  //   자동발행 self 글은 DB title 이 stub("키워드 #id")이고 진짜 서술형 헤드라인은
  //   본문 첫 <h1>에 있음. 이전엔 이 둘이 이중 H1(스텁+헤드라인)이었음.
  //   → 본문 h1 텍스트를 추출해 템플릿 H1(post.title 대체)로 쓰고 본문에선 제거.
  //   서술형 단일 H1 확보. 본문에 h1 없으면 headline=null → post.title 폴백.
  const extractAndStripFirstH1 = (
    html: string,
  ): { headline: string | null; rest: string } => {
    if (!html) return { headline: null, rest: html };
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (!m || m.index == null) return { headline: null, rest: html };
    const headline =
      m[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s*\|\s*위서클\s*$/, "")
        .replace(/\s+/g, " ")
        .trim() || null;
    const rest = html.slice(0, m.index) + html.slice(m.index + m[0].length);
    return { headline, rest };
  };

  let content: React.ReactNode;
  let bodyHeadline: string | null = null;
  if (post.source_type === "html") {
    const { headline, rest } = extractAndStripFirstH1(post.source);
    bodyHeadline = headline;
    content = (
      <div
        className="db-html-content"
        dangerouslySetInnerHTML={{ __html: stripReferenceSection(rest) }}
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

  // Round 143b — stub title 보정된 표시 제목 (본문 헤드라인 우선). H1·breadcrumb·스키마 공용.
  const displayTitle = bodyHeadline || post.title;
  const postForLd = { ...post, title: displayTitle };

  return (
    <>
      <ReadingProgress />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "블로그", href: "/blog" },
          { name: displayTitle, href: `/blog/${post.slug}` },
        ])}
      />
      <JsonLd data={articleLd(postForLd)} />
      <JsonLd data={medicalWebPageLd(postForLd)} />
      <JsonLd data={faqPageLd(post.faq ?? [])} />

      <div className="mx-auto w-full max-w-[1280px] px-6 py-10 md:py-14 lg:px-10">
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
                {displayTitle}
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

            {/* Round 109-B (2026-07-03) — 관련 파트너 콘텐츠 카드 (wecircle 내부 순환) */}
            {relatedPartnerPosts.length > 0 && (
              <section className="mx-auto mt-16 max-w-4xl">
                <div className="text-xs font-bold uppercase tracking-widest text-brand-700">
                  Related Partner Content
                </div>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
                  이 주제와 관련된 파트너 병원 콘텐츠
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                  위서클과 함께하는 병원의 전문 콘텐츠를 확인해보세요.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedPartnerPosts.map((rp) => {
                    const catMeta = PARTNER_CATEGORIES.find((c) => c.slug === rp.partner_category);
                    const href = `/with-partners/${rp.partner_category}/${rp.partner_slug}/${rp.slug}`;
                    return (
                      <Link
                        key={rp.id}
                        href={href}
                        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
                      >
                        {rp.cover_image_url && (
                          <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={rp.cover_image_url}
                              alt={rp.cover_image_alt || rp.title}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider">
                            {catMeta && (
                              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                                {catMeta.ko}
                              </span>
                            )}
                            <span className="text-ink-subtle">{rp.tenant_name}</span>
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-sm font-bold text-ink group-hover:text-brand">
                            {rp.title}
                          </h3>
                          {rp.excerpt && (
                            <p className="mt-1.5 line-clamp-2 text-xs text-ink-muted">
                              {rp.excerpt}
                            </p>
                          )}
                          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                            자세히 보기 →
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </article>

          <TableOfContents />
        </div>

        <RelatedPosts posts={allPosts} currentSlug={post.slug} currentCategory={post.blogCategory} />
      </div>
    </>
  );
}
