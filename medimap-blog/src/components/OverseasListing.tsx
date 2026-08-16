import Link from "next/link";
import Image from "next/image";
import type { OverseasCard } from "@/lib/guides";

/**
 * 해외 콘텐츠 카드 그리드 — /{lang}/clinics/[category] 등 공용.
 * Round 159b (2026-08-16) — 무신사·Round 152 국내판 미러: 16/9 보더 카드 →
 *   4/5 커버 포워드(보더 제거·hover scale 900ms ease-out). 크롬 무채색, 색은 사진 독점.
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
    <div className="mx-auto w-full max-w-[1280px] px-6 py-12 lg:px-10">
      <div className="border-b border-stone-300 pb-6">
        <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-stone-600">{subtitle}</p>}
      </div>

      {cards.length === 0 ? (
        <p className="mt-10 text-sm text-stone-500">{empty}</p>
      ) : (
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.slug} href={hrefFor(c)} className="group flex flex-col gap-4">
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
