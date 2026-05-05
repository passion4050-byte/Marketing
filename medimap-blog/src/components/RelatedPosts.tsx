import { ArticleCard } from "./ArticleCard";
import type { PostMeta } from "@/lib/posts";

export function RelatedPosts({
  posts,
  currentSlug,
}: {
  posts: PostMeta[];
  currentSlug: string;
}) {
  const others = posts.filter((p) => p.slug !== currentSlug).slice(0, 3);
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
