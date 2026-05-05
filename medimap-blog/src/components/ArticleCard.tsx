import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { PostMeta } from "@/lib/posts";

interface Props {
  post: PostMeta;
  variant?: "default" | "compact";
}

export function ArticleCard({ post, variant = "default" }: Props) {
  const compact = variant === "compact";
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col card-base card-hover ${
        compact ? "p-5" : "p-6"
      }`}
    >
      <div className="flex items-center gap-2">
        {post.category && (
          <span className="pill-label text-xs">{post.category}</span>
        )}
        {post.reviewedBy && (
          <span className="pill-tag border-brand-100 text-brand-700">
            의료진 검수
          </span>
        )}
      </div>
      <h3
        className={`mt-3 font-bold tracking-tight text-ink transition-colors group-hover:text-brand ${
          compact ? "text-lg" : "text-xl"
        }`}
      >
        {post.title}
      </h3>
      <p
        className={`mt-2 line-clamp-3 leading-relaxed text-ink-muted ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {post.description}
      </p>
      {post.tags && post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((t) => (
            <span key={t} className="pill-tag">
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between pt-5 text-xs text-ink-subtle">
        <div className="flex items-center gap-3">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {readingTimeFromMeta(post)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 font-semibold text-brand transition-transform group-hover:translate-x-0.5">
          더 읽기 <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function readingTimeFromMeta(post: PostMeta): string {
  // Description-based heuristic; real article reading time is computed in detail page.
  const text = `${post.title} ${post.description}`;
  const words = text.replace(/\s+/g, " ").trim().length;
  const minutes = Math.max(2, Math.round((words / 500) * 5));
  return `${minutes}분`;
}
