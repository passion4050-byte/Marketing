import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import type { PostMeta } from "@/lib/posts";

interface Props {
  post: PostMeta;
  variant?: "default" | "compact";
}

export function ArticleCard({ post, variant = "default" }: Props) {
  const compact = variant === "compact";
  return (
    <Link
      href={`/blog/${encodeURIComponent(post.slug)}`}
      className={`group flex flex-col card-base card-hover card-accent-top overflow-hidden ${
        compact ? "p-0" : "p-0"
      }`}
    >
      {post.cover_image_url && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-alt">
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className={compact ? "p-5" : "p-6"}>
      <div className="flex items-center gap-1.5">
        {post.category && <span className="pill-label">{post.category}</span>}
        {post.reviewedBy && (
          <span className="pill-tag border-brand-100 text-brand-700">
            의료진 검수
          </span>
        )}
      </div>
      <h3
        className={`mt-4 font-bold tracking-tight text-ink transition-colors group-hover:text-brand ${
          compact ? "text-[17px] leading-snug" : "text-[19px] leading-snug"
        }`}
      >
        {post.title}
      </h3>
      <p
        className={`mt-2 line-clamp-3 leading-relaxed text-ink-muted ${
          compact ? "text-[13px]" : "text-sm"
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
        <div className="flex items-center gap-2">
          <time dateTime={post.date} className="num">
            {formatDate(post.date)}
          </time>
          <span className="meta-divider" />
          <span className="pill-stat">
            <Clock size={12} />
            {post.readingMinutes}분
          </span>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink-muted transition-all group-hover:border-brand group-hover:bg-brand group-hover:text-white">
          <ArrowUpRight size={16} strokeWidth={2.5} className="text-current" />
        </span>
      </div>
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
