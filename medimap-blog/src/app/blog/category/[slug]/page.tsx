import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BLOG_CATEGORY_SLUGS,
  getBlogCategoryMeta,
  getPostsByBlogCategory,
  type BlogCategorySlug,
} from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

// 자사 인사이트 카테고리 페이지 — runtime 매 요청 fresh fetch
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BLOG_CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { slug } = await params;
  const meta = getBlogCategoryMeta(slug);
  if (!meta) return { title: "카테고리 — 메디맵 인사이트" };
  const title = `${meta.ko} — 메디맵 인사이트`;
  const description = `${meta.description}. 메디맵이 운영하는 자사 마케팅 인사이트 콘텐츠.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/blog/category/${slug}`) },
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function BlogCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const meta = getBlogCategoryMeta(slug);
  if (!meta) notFound();

  const posts = await getPostsByBlogCategory(meta.slug as BlogCategorySlug);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-14">
      <nav className="mb-6 text-xs text-ink-muted">
        <Link href="/blog" className="hover:text-brand">
          메디맵 인사이트
        </Link>{" "}
        / <span className="font-semibold text-ink">{meta.ko}</span>
      </nav>

      <header className="mb-10">
        <div className="text-3xl">{meta.emoji}</div>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {meta.ko}
        </h1>
        <p className="mt-3 text-base text-ink-soft">{meta.description}</p>
      </header>

      <section>
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <p className="text-sm text-ink-muted">
              아직 발행된 글이 없습니다. 곧 새로운 인사이트로 찾아뵙겠습니다.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {posts.map((p) => (
              <li key={p.slug} className="py-5">
                <Link
                  href={`/blog/${p.slug}`}
                  className="block hover:text-brand"
                >
                  <div className="text-xs text-ink-muted">
                    {p.author && `${p.author} · `}
                    {p.date} · {p.readingMinutes}분 읽기
                  </div>
                  <div className="mt-1 text-lg font-bold text-ink">
                    {p.title}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft line-clamp-2">
                    {p.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
