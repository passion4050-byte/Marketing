import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryMeta, getPartnerPost } from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const revalidate = 60;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ category: string; partner: string; slug: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) return { title: "파트너 글 — 메디맵" };
  const post = await getPartnerPost(meta.slug, partner, slug);
  if (!post) return { title: "파트너 글 — 메디맵" };
  return {
    title: `${post.title} | ${post.tenant_name} · 메디맵`,
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
        ? [
            {
              url: post.cover_image_url,
              alt: post.cover_image_alt || post.title,
            },
          ]
        : undefined,
    },
  };
}

export default async function PartnerPostPage({ params }: PageProps) {
  const { category, partner, slug } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) notFound();
  const post = await getPartnerPost(meta.slug, partner, slug);
  if (!post) notFound();

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    author: {
      "@type": "Organization",
      name: post.tenant_name,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.publisher.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteConfig.publisher.logo),
      },
    },
    mainEntityOfPage: absoluteUrl(
      `/with-partners/${category}/${partner}/${slug}`,
    ),
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />

      <nav className="mb-6 text-xs text-ink-muted">
        <Link href="/with-partners" className="hover:text-brand">
          파트너 콘텐츠
        </Link>{" "}
        /{" "}
        <Link
          href={`/with-partners/${meta.slug}`}
          className="hover:text-brand"
        >
          {meta.ko}
        </Link>{" "}
        /{" "}
        <Link
          href={`/with-partners/${meta.slug}/${post.partner_slug}`}
          className="hover:text-brand"
        >
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
          {post.published_at} · 메디맵 의료법 가이드 통과
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
        dangerouslySetInnerHTML={{ __html: post.body }}
      />

      <footer className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-700">
          파트너 병원
        </div>
        <h3 className="mt-1 text-lg font-bold text-ink">{post.tenant_name}</h3>
        <p className="mt-2 text-sm text-ink-soft">
          진료/상담 문의는 메디맵 카카오 채널을 통해 연결됩니다.
        </p>
        <a
          href={siteConfig.contact.kakao}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-bold text-[#3C1E1E]"
        >
          카카오톡으로 상담받기
        </a>
      </footer>
    </main>
  );
}
