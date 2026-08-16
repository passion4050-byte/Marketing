import Link from "next/link";
import Image from "next/image";
import type { OverseasCard } from "@/lib/guides";
import {
  OVERSEAS_BLOG_CATEGORIES,
  OVERSEAS_BLOG_LABELS,
  type OverseasLang,
} from "@/lib/overseasBlog";

/**
 * 해외 블로그 인덱스 — 국내 /blog 미러.
 * Round 159b (2026-08-16) — 무신사·Round 152 국내판과 동일한 커버 포워드 전환:
 *   16/9 보더 카드 → featured hero(4/5 커버 + 5fr/7fr split) + 4/5 커버 그리드.
 *   크롬은 무채색 유지, 생동감은 사진 밀도가 담당. 모션은 hover scale(900ms ease-out)만.
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
  counts,
}: {
  lang: OverseasLang;
  title: string;
  subtitle?: string;
  cards: OverseasCard[];
  sectionsLabel: string;
  storiesLabel: (n: number) => string;
  activeCat?: string;
  /** 카테고리별 전체 카운트(레일용). 미제공 시 cards 로 계산 — 필터된 페이지에선 counts 를 넘길 것. */
  counts?: Record<string, number>;
}) {
  const labels = OVERSEAS_BLOG_LABELS[lang];
  const countBy = new Map<string, number>();
  if (counts) {
    for (const [k, v] of Object.entries(counts)) countBy.set(k, v);
  } else {
    for (const c of cards) {
      if (c.blog_category)
        countBy.set(c.blog_category, (countBy.get(c.blog_category) ?? 0) + 1);
    }
  }

  // Featured = 커버 있는 최신 글 (없으면 첫 글). 나머지는 그리드.
  const featured = cards.find((c) => c.cover_image_url) ?? cards[0];
  const rest = cards.filter((c) => c.slug !== featured?.slug);

  const catLabel = (c: OverseasCard) =>
    c.blog_category
      ? labels[c.blog_category as keyof typeof labels]?.label ?? ""
      : "";

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-12 lg:px-10">
      {/* Masthead */}
      <div className="border-b border-stone-300 pb-6">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
          <span className="inline-block h-px w-6 bg-stone-400" />
          Wecircle Global · Stories
        </div>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-stone-600">{subtitle}</p>}
      </div>

      {/* Featured cover-forward hero (Round 152 국내 미러) */}
      {featured && (
        <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-14">
          <Link href={`/${lang}/guides/${featured.slug}`} className="group block">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-200">
              {featured.cover_image_url ? (
                <Image
                  src={featured.cover_image_url}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  priority
                  unoptimized
                  className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
                  <span className="font-serif text-lg italic text-stone-300">WECIRCLE</span>
                </div>
              )}
            </div>
          </Link>
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-900" />
              Featured
              {catLabel(featured) && (
                <>
                  <span className="text-stone-300">/</span>
                  <span>{catLabel(featured)}</span>
                </>
              )}
            </div>
            <h2 className="mt-5 text-[30px] font-black leading-[1.12] tracking-[-0.02em] text-stone-950 md:text-[42px]">
              <Link
                href={`/${lang}/guides/${featured.slug}`}
                className="transition hover:text-stone-700"
              >
                {featured.title}
              </Link>
            </h2>
            {featured.excerpt && (
              <p className="mt-5 max-w-lg text-[15px] leading-[1.75] text-stone-600">
                {featured.excerpt}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Category rail */}
      <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-stone-200/70 py-4">
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

      {/* Cover-forward grid (무신사: 사진이 색·활력 독점) */}
      {cards.length === 0 ? (
        <p className="mt-10 text-sm text-stone-500">—</p>
      ) : (
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((c) => (
            <Link
              key={c.slug}
              href={`/${lang}/guides/${c.slug}`}
              className="group flex flex-col gap-4"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-200">
                {c.cover_image_url ? (
                  <Image
                    src={c.cover_image_url}
                    alt={c.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                    className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    WECIRCLE
                  </div>
                )}
              </div>
              {catLabel(c) && (
                <div className="mt-1 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-900" />
                  {catLabel(c)}
                </div>
              )}
              <h3 className="text-[19px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-700">
                {c.title}
              </h3>
              {c.excerpt && (
                <p className="line-clamp-2 text-[14px] leading-relaxed text-stone-600">
                  {c.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
