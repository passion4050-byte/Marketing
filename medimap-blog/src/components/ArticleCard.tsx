import Link from "next/link";
import Image from "next/image";
import type { PostMeta } from "@/lib/posts";

interface Props {
  post: PostMeta;
  variant?: "default" | "compact" | "index";
  index?: number;
}

const CATEGORY_OVERLINE: Record<string, string> = {
  content_marketing: "Content Marketing",
  ai_trend: "AI & Search",
  hospital_marketing: "Hospital Marketing",
};

/**
 * Round 111 v3 (2026-07-02) — Editorial variants.
 *   - default: cover-forward vertical (magazine sub-card)
 *   - compact: text-only compact (grid fallback)
 *   - index:   TOC row with numeral (magazine table-of-contents)
 */
export function ArticleCard({ post, variant = "default", index }: Props) {
  if (variant === "index") return <IndexRow post={post} index={index ?? 0} />;
  if (variant === "compact") return <CompactCard post={post} />;
  return <DefaultCard post={post} />;
}

function DefaultCard({ post }: { post: PostMeta }) {
  const overline = post.blogCategory ? CATEGORY_OVERLINE[post.blogCategory] ?? post.blogCategory : "Insights";
  return (
    <Link
      href={`/blog/${encodeURIComponent(post.slug)}`}
      className="group flex flex-col gap-4"
    >
      {/* Cover */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-200">
        {post.cover_image_url ? (
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover grayscale transition duration-[900ms] ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-400">
            No cover
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mt-1 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-900" />
        {overline}
        {post.reviewedBy && (
          <>
            <span className="text-stone-300">·</span>
            <span>Reviewed</span>
          </>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[19px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-700 md:text-[21px]">
        {post.title}
      </h3>

      {/* Description */}
      {post.description && (
        <p className="line-clamp-2 text-[14px] leading-relaxed text-stone-600">
          {post.description}
        </p>
      )}

      {/* Bottom meta */}
      <div className="mt-1 flex items-center gap-3 border-t border-stone-200/70 pt-3 text-[11px] tabular-nums text-stone-500">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span className="text-stone-300">·</span>
        <span>{post.readingMinutes} min</span>
      </div>
    </Link>
  );
}

function CompactCard({ post }: { post: PostMeta }) {
  const overline = post.blogCategory ? CATEGORY_OVERLINE[post.blogCategory] ?? post.blogCategory : "Insights";
  return (
    <Link
      href={`/blog/${encodeURIComponent(post.slug)}`}
      className="group flex flex-col gap-3 border-t border-stone-300 pt-6"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
        {overline}
      </div>
      <h3 className="text-[17px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-600">
        {post.title}
      </h3>
      {post.description && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-stone-600">
          {post.description}
        </p>
      )}
      <div className="mt-auto flex items-center gap-3 text-[11px] tabular-nums text-stone-500">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span className="text-stone-300">·</span>
        <span>{post.readingMinutes} min</span>
      </div>
    </Link>
  );
}

function IndexRow({ post, index }: { post: PostMeta; index: number }) {
  const overline = post.blogCategory ? CATEGORY_OVERLINE[post.blogCategory] ?? post.blogCategory : "Insights";
  const num = String(index + 1).padStart(2, "0");
  return (
    <Link
      href={`/blog/${encodeURIComponent(post.slug)}`}
      className="group grid grid-cols-[48px_1fr_auto] items-center gap-6 py-6 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,180px)_auto] md:gap-10 md:py-8"
    >
      <span className="font-serif text-2xl font-light tabular-nums leading-none text-stone-400 transition group-hover:text-stone-900 md:text-3xl">
        {num}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
          {overline}
        </div>
        <h3 className="mt-1.5 text-[17px] font-bold tracking-tight text-stone-950 transition group-hover:text-stone-700 md:text-[19px]">
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1.5 line-clamp-1 text-sm text-stone-500">
            {post.description}
          </p>
        )}
      </div>
      <div className="hidden text-right text-xs text-stone-500 tabular-nums md:block">
        <div>{formatDate(post.date, "short")}</div>
        <div className="mt-0.5 text-stone-400">{post.readingMinutes} min</div>
      </div>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-900"
        aria-hidden
      >
        <path stroke="currentColor" d="M7 17L17 7" />
        <path stroke="currentColor" d="M7 7h10v10" />
      </svg>
    </Link>
  );
}

function formatDate(iso: string, style: "full" | "short" = "full"): string {
  const d = new Date(iso);
  if (style === "short") {
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
