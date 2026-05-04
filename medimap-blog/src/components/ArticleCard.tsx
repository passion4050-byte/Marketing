import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PostMeta } from "@/lib/posts";

export function ArticleCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-card border border-line bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
    >
      {post.category && (
        <span className="pill-label mb-3 self-start">{post.category}</span>
      )}
      <h3 className="text-xl font-bold tracking-tight text-ink group-hover:text-brand">
        {post.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
        {post.description}
      </p>
      <div className="mt-6 flex items-center justify-between text-xs text-ink-subtle">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span className="inline-flex items-center gap-1 text-brand">
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
