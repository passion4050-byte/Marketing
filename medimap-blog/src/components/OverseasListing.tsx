import Link from "next/link";
import type { OverseasCard } from "@/lib/guides";

/**
 * 해외 콘텐츠 카드 그리드 — /{lang}/blog, /{lang}/clinics/[category]/[partner] 공용.
 * 국내 blog/with-partners 인덱스 미러.
 */
export function OverseasListing({
  title,
  subtitle,
  cards,
  hrefFor,
  empty = "No articles yet.",
}: {
  title: string;
  subtitle?: string;
  cards: OverseasCard[];
  hrefFor: (c: OverseasCard) => string;
  empty?: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-3 max-w-2xl text-stone-600">{subtitle}</p>}

      {cards.length === 0 ? (
        <p className="mt-10 text-sm text-stone-500">{empty}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.slug}
              href={hrefFor(c)}
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
                <div className="font-bold leading-snug text-stone-900">{c.title}</div>
                {c.excerpt && (
                  <div className="mt-2 text-[13px] leading-relaxed text-stone-600">{c.excerpt}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
