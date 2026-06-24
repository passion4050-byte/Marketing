import { ArticleCard } from "./ArticleCard";
import type { PostMeta } from "@/lib/posts";

export function RelatedPosts({
  posts,
  currentSlug,
  currentCategory,
}: {
  posts: PostMeta[];
  currentSlug: string;
  /** Round 81 — 같은 카테고리(진료과/주제) 글을 우선 추천 → 내부 링크·체류시간·크롤 발견 ↑ */
  currentCategory?: string;
}) {
  const pool = posts.filter((p) => p.slug !== currentSlug);
  const sameCat = currentCategory
    ? pool.filter((p) => p.blogCategory === currentCategory)
    : [];
  const sameSlugs = new Set(sameCat.map((p) => p.slug));
  const others = [...sameCat, ...pool.filter((p) => !sameSlugs.has(p.slug))].slice(0, 3);
  if (others.length === 0) return null;
  return (
    <section className="mx-auto mt-16 max-w-content">
      <div className="flex items-end justify-between">
        <div>
          <span className="pill-label">함께 읽어보세요</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            관련 인사이트
          </h2>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {others.map((p) => (
          <ArticleCard key={p.slug} post={p} variant="compact" />
        ))}
      </div>
    </section>
  );
}
