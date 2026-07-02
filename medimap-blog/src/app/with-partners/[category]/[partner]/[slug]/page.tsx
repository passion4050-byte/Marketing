import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryMeta, getPartnerPost, getPartnerPostsByPartner } from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";

// Round 12: force-dynamic 으로 빌드 시점 prerender 회피 + dynamicParams 자동 활성
export const dynamic = 'force-dynamic';

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
    "@type": "MedicalWebPage",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
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
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />

      <nav className="mb-6 text-xs text-ink-muted">
        <Link href="/with-partners" className="hover:text-brand">파트너 콘텐츠</Link>
        {" / "}
        <Link href={`/with-partners/${meta.slug}`} className="hover:text-brand">{meta.ko}</Link>
        {" / "}
        <Link href={`/with-partners/${meta.slug}/${post.partner_slug}`} className="hover:text-brand">
          {post.tenant_name}
        </Link>
      </nav>

      <header className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-700">
          {meta.ko} · {post.tenant_name}
        </div>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          {post.published_at} · 위서클 의료법 가이드 통과
        </p>
      </header>

      {post.cover_image_url && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-slate-100">
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
        className="prose prose-slate max-w-none prose-headings:text-ink prose-a:text-brand"
        dangerouslySetInnerHTML={{
          __html: stripReferenceSection(stripFirstH1IfMatchesTitle(post.body, post.title)),
        }}
      />

      {/* Round 108-e — 카카오톡 상담 CTA (외부 URL 대신 wecircle 채널) */}
      <div className="mt-10 rounded-2xl bg-gradient-to-br from-brand-50 to-white border border-brand-100 p-6 text-center shadow-soft">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-700">
          {post.tenant_name}
        </div>
        <h3 className="mt-2 text-xl font-extrabold text-ink">
          지금 바로 상담받고 자세히 알아보세요
        </h3>
        <p className="mt-2 text-sm text-ink-soft">
          위서클 상담 채널을 통해 {post.tenant_name}과 연결됩니다.
        </p>
        <a
          href={siteConfig.contact.kakao}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#FEE500] px-6 py-3 text-base font-extrabold text-[#3C1E1E] shadow-md transition hover:scale-105 hover:shadow-lg"
        >
          💬 카카오톡으로 상담받기
        </a>
      </div>

      {/* Round 108-e — 관련 콘텐츠 (같은 병원 다른 글) */}
      {relatedPosts.length > 0 && (
        <section className="mt-16">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-700">
            함께 보면 좋은 글
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-ink">
            {post.tenant_name}의 관련 콘텐츠
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.id}
                href={`/with-partners/${category}/${partner}/${rp.slug}`}
                className="group block rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-soft transition hover:border-brand-200 hover:shadow-card"
              >
                {rp.cover_image_url && (
                  <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden">
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
                  <h3 className="text-sm font-bold text-ink line-clamp-2 group-hover:text-brand">
                    {rp.title}
                  </h3>
                  {rp.excerpt && (
                    <p className="mt-1.5 text-xs text-ink-muted line-clamp-2">
                      {rp.excerpt}
                    </p>
                  )}
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                    자세히 보기 →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
