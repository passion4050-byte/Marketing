import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryMeta, getPartnerPost, getPartnerPostsByPartner } from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { kakaoTrackHref, TRACK_LINK_REL } from "@/lib/ctaLink";
// Round 129 (2026-07-05) — SEO: 파트너 글 BreadcrumbList (3단 경로 구조화)
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd, faqPageLd } from "@/lib/schema";
import { extractFaqFromBody } from "@/lib/posts";

// Round 12: force-dynamic 으로 빌드 시점 prerender 회피 + dynamicParams 자동 활성
// Round 129 — blog/[slug] 와 대칭: ISR 60s (첫 요청 SSR 후 캐시. archived 반영
//   최대 60s 지연은 기존 캐비앗과 동일 수용).
export const revalidate = 60;

interface PageProps {
  params: Promise<{ category: string; partner: string; slug: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) return { title: "파트너 글 — WECIRCLE" };
  const post = await getPartnerPost(meta.slug, partner, slug);
  if (!post) return { title: "파트너 글 — WECIRCLE" };
  return {
    title: `${post.title} | ${post.tenant_name}`,
    description: post.excerpt,
    alternates: {
      canonical: absoluteUrl(`/with-partners/${category}/${partner}/${slug}`),
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: absoluteUrl(`/with-partners/${category}/${partner}/${slug}`),
      siteName: siteConfig.name,
      type: "article",
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, alt: post.cover_image_alt || post.title }]
        : undefined,
    },
  };
}

function stripFirstH1IfMatchesTitle(body: string, title: string): string {
  if (!body) return body;
  const norm = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return body.replace(/<h1[^>]*>([\s\S]*?)<\/h1>\s*/i, (m, inner) => {
    return norm(inner) === norm(title) ? '' : m;
  });
}

/**
 * Round 108-e (2026-07-03) — 본문 하단 "참고 자료" / 병원 위치/홈페이지 링크 제거.
 * 사용자 요구: wecircle.co.kr 내부에서만 활동 유도, 외부 URL 배제.
 * body 안의 <h2>참고 자료</h2> ~ 페이지 끝까지 제거 (LLM 이 자동 생성한 참고 링크 섹션).
 */
function stripReferenceSection(body: string): string {
  if (!body) return body;
  // "참고 자료" / "참고자료" H2 이후 전부 제거 (다음 H2 나올 때까지 or 끝까지)
  const patterns = [
    /<h2[^>]*>\s*참고\s*자료\s*<\/h2>[\s\S]*$/i,
    /<h2[^>]*>\s*References?\s*<\/h2>[\s\S]*$/i,
    /<h2[^>]*>\s*참고\s*문헌\s*<\/h2>[\s\S]*$/i,
  ];
  let out = body;
  for (const p of patterns) {
    out = out.replace(p, "");
  }
  // 남은 http(s):// 로 시작하는 마지막 링크만 있는 문단도 제거 (병원 홈페이지/네이버 지도 URL 잔재)
  out = out.replace(
    /<p[^>]*>\s*(?:홈페이지|네이버\s*지도|웹사이트|사이트)[^<]*<\/p>/gi,
    "",
  );
  return out;
}

export default async function PartnerPostPage({ params }: PageProps) {
  const { category, partner, slug } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) notFound();
  const post = await getPartnerPost(meta.slug, partner, slug);
  if (!post) notFound();

  // Round 108-e — 같은 병원의 다른 콘텐츠 3~4편 (관련 콘텐츠 CTA)
  const partnerPosts = await getPartnerPostsByPartner(meta.slug, partner);
  const relatedPosts = partnerPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 4);

  const ldJson = {
    "@context": "https://schema.org",
    // Round 118-C (2026-07-04) — Article 멀티타입 추가. MedicalWebPage 단독으로는
    // 구글/AI 엔진의 기사형 리치결과·인용 대상에서 빠짐. 필수 필드(headline/
    // datePublished/author/publisher/image)는 이미 충족.
    "@type": ["Article", "MedicalWebPage"],
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.published_at,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    author: { "@type": "Organization", name: post.tenant_name },
    publisher: {
      "@type": "Organization",
      name: siteConfig.publisher.name,
      logo: { "@type": "ImageObject", url: absoluteUrl(siteConfig.publisher.logo) },
    },
    mainEntityOfPage: absoluteUrl(`/with-partners/${category}/${partner}/${slug}`),
  };

  return (
    <main className="mx-auto w-full max-w-[860px] px-6 py-14 md:py-20 lg:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
      {/* Round 143 (SEO 감사 ①) — 파트너 글 FAQPage. 본문 질문형 H2+답변을 추출해 스키마화.
          자사(/blog)는 이미 있었으나 파트너는 누락 → Google FAQ 리치결과 + AI 인용성 확보.
          본문에 이미 있는 Q&A를 미러링만 하므로 새 주장 없음(의료법 안전). */}
      <JsonLd data={faqPageLd(extractFaqFromBody(post.body))} />
      {/* Round 129 — 3단 경로 BreadcrumbList (검색 결과 경로 표시 + 구조 신호) */}
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "파트너 콘텐츠", href: "/with-partners" },
          { name: meta.ko, href: `/with-partners/${category}` },
          { name: post.tenant_name, href: `/with-partners/${category}/${partner}` },
        ])}
      />

      <nav className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
        <span className="inline-block h-px w-6 bg-stone-400" />
        <Link href="/with-partners" className="hover:text-stone-900">Partners</Link>
        <span className="text-stone-300">/</span>
        <Link href={`/with-partners/${meta.slug}`} className="hover:text-stone-900">{meta.ko}</Link>
        <span className="text-stone-300">/</span>
        <Link href={`/with-partners/${meta.slug}/${post.partner_slug}`} className="hover:text-stone-900">
          {post.tenant_name}
        </Link>
      </nav>

      <header className="mb-10 mt-10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
          {meta.ko} · {post.tenant_name}
        </div>
        <h1 className="mt-4 text-[36px] font-black leading-[1.1] tracking-[-0.025em] text-stone-950 md:text-[48px]">
          {post.title}
        </h1>
        <div className="mt-6 flex items-center gap-3 border-t border-stone-200/70 pt-4 text-[12px] tabular-nums text-stone-500">
          <time>{post.published_at}</time>
          <span className="text-stone-300">·</span>
          <span>위서클 의료법 가이드 통과</span>
        </div>
      </header>

      {post.cover_image_url && (
        <div className="mb-10 overflow-hidden bg-stone-100">
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt || post.title}
            width={1200}
            height={630}
            className="h-auto w-full object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      <article
        className="prose-medimap max-w-none"
        dangerouslySetInnerHTML={{
          __html: stripReferenceSection(stripFirstH1IfMatchesTitle(post.body, post.title)),
        }}
      />

      {/* Editorial CTA */}
      <div className="mt-16 border-t border-stone-300 pt-10">
        <div className="grid gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              Consultation · {post.tenant_name}
            </div>
            <h3 className="mt-4 font-serif text-2xl italic leading-tight text-stone-900 md:text-[28px]">
              &ldquo;더 자세한 상담이 필요하다면.&rdquo;
            </h3>
            <p className="mt-3 max-w-md text-[14px] leading-[1.75] text-stone-600">
              위서클 상담 채널을 통해 {post.tenant_name}과 연결됩니다.
            </p>
          </div>
          {/*
            Round 144c — 추적 링크 경유로 변경.
            기존엔 오픈카톡 직링크라 클릭이 서버에 기록되지 않아
            "AI 노출 → 실제 문의" 전환을 측정할 수 없었다.
            /r/k-{partner_slug} → shortlink_clicks 적재 → 302 로 카카오 이동.
          */}
          <a
            href={kakaoTrackHref(post.partner_slug ?? partner)}
            target="_blank"
            rel={TRACK_LINK_REL}
            className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
          >
            <span className="text-sm font-bold tracking-tight">카카오톡으로 상담받기</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden>
              <path stroke="currentColor" d="M7 17L17 7" />
              <path stroke="currentColor" d="M7 7h10v10" />
            </svg>
          </a>
        </div>
      </div>

      {/* Round 108-e — 관련 콘텐츠 (같은 병원 다른 글) */}
      {relatedPosts.length > 0 && (
        <section className="mt-16 border-t border-stone-200/70 pt-10">
          <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">
              More from {post.tenant_name}
            </h2>
            <span className="text-xs tabular-nums text-stone-500">{relatedPosts.length}</span>
          </div>
          <ol className="divide-y divide-stone-200/70">
            {relatedPosts.map((rp, i) => (
              <li key={rp.id}>
                <Link
                  href={`/with-partners/${category}/${partner}/${rp.slug}`}
                  className="group grid grid-cols-[40px_1fr_auto] items-center gap-4 py-5 md:grid-cols-[56px_minmax(0,1fr)_auto] md:gap-8"
                >
                  <span className="font-serif text-2xl font-light tabular-nums leading-none text-stone-400 transition group-hover:text-stone-900">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-700 md:text-[17px]">
                      {rp.title}
                    </h3>
                    {rp.excerpt && (
                      <p className="mt-1 line-clamp-1 text-sm text-stone-500">
                        {rp.excerpt}
                      </p>
                    )}
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-900" aria-hidden>
                    <path stroke="currentColor" d="M7 17L17 7" />
                    <path stroke="currentColor" d="M7 7h10v10" />
                  </svg>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
