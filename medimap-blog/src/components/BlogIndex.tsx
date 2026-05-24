"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import type { PostMeta } from "@/lib/posts";

interface Props {
  posts: PostMeta[];
  categories: string[];
}

/**
 * Client island for the blog index. Reads `?category=...` from the URL,
 * highlights the active category chip, filters the list, and bumps history
 * via `router.replace` (no full reload).
 *
 * Featured card is unconditional: explicit `featured: true` frontmatter wins,
 * otherwise the newest post — and is *not* removed by the category filter
 * (it is the editorial pick).
 */
export function BlogIndex({ posts, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "";

  const featured = useMemo(
    () => posts.find((p) => p.featured) ?? posts[0],
    [posts],
  );

  const rest = useMemo(() => {
    const withoutFeatured = featured
      ? posts.filter((p) => p.slug !== featured.slug)
      : posts;
    if (!active) return withoutFeatured;
    return withoutFeatured.filter((p) => p.category === active);
  }, [posts, featured, active]);

  const setCategory = (cat: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (!cat) {
      sp.delete("category");
    } else {
      sp.set("category", cat);
    }
    const qs = sp.toString();
    router.replace(qs ? `/blog?${qs}` : "/blog", { scroll: false });
  };

  return (
    <>
      {categories.length > 0 && (
        <div className="mt-10 flex flex-wrap justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("")}
            aria-pressed={active === ""}
            className={
              active === ""
                ? "pill-tag border-brand-200 bg-brand-50 text-brand-700"
                : "pill-tag transition hover:border-brand-100 hover:text-brand"
            }
          >
            전체
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={active === c}
              className={
                active === c
                  ? "pill-tag border-brand-200 bg-brand-50 text-brand-700"
                  : "pill-tag transition hover:border-brand-100 hover:text-brand"
              }
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {!active && featured && (
        <Link
          href={`/blog/${encodeURIComponent(featured.slug)}`}
          className="group mt-12 grid gap-6 overflow-hidden rounded-card border border-line/70 bg-white p-6 shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-card md:grid-cols-[1.4fr_1fr] md:p-8"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="pill-label">최신 발행</span>
              {featured.reviewedBy && (
                <span className="pill-tag border-brand-100 text-brand-700">
                  의료진 검수: {featured.reviewedBy}
                </span>
              )}
            </div>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight transition-colors group-hover:text-brand md:text-[30px]">
              {featured.title}
            </h2>
            <p className="mt-3 line-clamp-3 leading-relaxed text-ink-muted">
              {featured.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {(featured.tags ?? []).slice(0, 4).map((t) => (
                <span key={t} className="pill-tag">
                  #{t}
                </span>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-transform group-hover:translate-x-0.5">
              가이드 읽기 <ArrowUpRight size={14} />
            </div>
          </div>
          <div className="relative hidden items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-brand-50 via-white to-accent-50 md:flex">
            {featured.cover_image_url ? (
              <img
                src={featured.cover_image_url}
                alt={featured.cover_image_alt ?? featured.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <>
                <div className="absolute inset-6 rounded-card border border-brand-100/40" />
                <div
                  className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-2xl"
                  aria-hidden
                  style={{ transform: "translateZ(0)" }}
                />
                <div className="relative px-6 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700">
                    FEATURED
                  </div>
                  <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink balance-text md:text-4xl">
                    {featured.category ?? "메디컬"}
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>
      )}

      {rest.length > 0 ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <ArticleCard key={p.slug} post={p} />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-card border border-dashed border-line bg-white p-12 text-center">
          <div className="text-2xl">🔎</div>
          <p className="mt-3 text-ink-subtle">
            <span className="font-semibold text-ink-muted">{active}</span>{" "}
            카테고리에 해당하는 글이 아직 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setCategory("")}
            className="btn-secondary mt-5 px-5 py-2 text-sm"
          >
            전체 글 보기
          </button>
        </div>
      )}
    </>
  );
}
