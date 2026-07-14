import Link from "next/link";
import type { OverseasCard } from "@/lib/guides";
import {
  OVERSEAS_BLOG_CATEGORIES,
  OVERSEAS_BLOG_LABELS,
  type OverseasLang,
} from "@/lib/overseasBlog";

/**
 * 해외 블로그 인덱스 — 국내 /blog 미러(카테고리 레일 + 매거진 리스트).
 * 축: K-뷰티의 우수성 / K-의료의 우수성 / K-의료·뷰티 이용 꿀팁 (B2C·GEO).
 */
export function OverseasBlogIndex({
  lang,
  title,
  subtitle,
  cards,
  sectionsLabel,
  storiesLabel,
  activeCat,
}: {
  lang: OverseasLang;
  title: string;
  subtitle?: string;
  cards: OverseasCard[];
  sectionsLabel: string;
  storiesLabel: (n: number) => string;
  activeCat?: string;
}) {
  const labels = OVERSEAS_BLOG_LABELS[lang];
  const countBy = new Map<string, number>();
  for (const c of cards) {
    if (c.blog_category)
      countBy.set(c.blog_category, (countBy.get(c.blog_category) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-3 max-w-2xl text-stone-600">{subtitle}</p>}

      {/* Category rail */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-y border-stone-200/70 py-4">
        <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
          {sectionsLabel}
        </span>
        {OVERSEAS_BLOG_CATEGORIES.map((cat) => {
          const count = countBy.get(cat) ?? 0;
          const active = activeCat === cat;
          return (
            <Link
              key={cat}
              href={`/${lang}/blog/category/${cat}`}
              className={`group inline-flex items-center gap-2 border px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300/80 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-900 hover:text-white"
              }`}
            >
              <span>{labels[cat].label}</span>
              <span
                className={`text-[10px] tabular-nums ${
                  active ? "text-stone-300" : "text-stone-400 group-hover:text-stone-300"
                }`}
              >
                {String(count).padStart(2, "0")}
              </span>
            </Link>
          );
        })}
        <span className="ml-auto text-xs text-stone-500 tabular-nums">
          {storiesLabel(cards.length)}
        </span>
      </div>

      {/* Card grid */}
      {cards.length === 0 ? (
        <p className="mt-10 text-sm text-stone-500">—</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.slug}
              href={`/${lang}/guides/${c.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-stone-900"
            >
              {c.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.cover_image_url}
                  alt={c.title}
                  className="aspect-[16/9] w-full object-cover"
                  decoding="async"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                {c.blog_category && (
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {labels[c.blog_category as keyof typeof labels]?.label ?? ""}
                  </div>
                )}
                <div className="font-bold leading-snug text-stone-900">{c.title}</div>
                {c.excerpt && (
                  <div className="mt-2 text-[13px] leading-relaxed text-stone-600">
                    {c.excerpt}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
