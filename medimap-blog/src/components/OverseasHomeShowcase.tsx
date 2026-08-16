import Link from "next/link";
import Image from "next/image";
import { getOverseasCards, getOverseasClinicDirectory } from "@/lib/guides";

/**
 * Round 159b (2026-08-16) — 해외 홈 이미지 밀도 섹션 (무신사·Round 152 국내 홈 미러).
 *
 * 배경: 국내 홈은 Latest 9장 + 파트너 커버 스트립으로 전환됐는데 해외 홈은
 * 텍스트 랜딩만 남아 있었음. 국내와 동일하게 "사진이 색·활력을 독점"하는
 * 두 섹션을 서버 컴포넌트로 공용화 — en/ja/zh/tw 4개 홈에 1줄 삽입.
 * 콘텐츠 0 인 언어(tw 초기)는 통째로 렌더 생략 (빈 섹션 노출 금지).
 */
export interface ShowcaseLabels {
  latestOverline: string; // e.g. "Latest Stories"
  latestTitle: string; // e.g. "Guides for your visit"
  viewAll: string; // e.g. "View all"
  clinicsOverline: string; // e.g. "Partner Clinics"
  clinicsTitle: string; // e.g. "Clinics we publish for"
  guidesCount: (n: number) => string; // e.g. (n) => `${n} guides`
}

export async function OverseasHomeShowcase({
  lang,
  labels,
}: {
  lang: "en" | "ja" | "zh" | "tw";
  labels: ShowcaseLabels;
}) {
  const contentLang = lang === "zh" ? "zh-Hans" : lang === "tw" ? "zh-Hant" : lang;
  const [cards, clinics] = await Promise.all([
    getOverseasCards(contentLang, { kind: "blog" }),
    getOverseasClinicDirectory(lang),
  ]);

  const latest = cards.slice(0, 9);
  const clinicStrip = clinics.filter((c) => c.cover_image_url).slice(0, 4);
  if (latest.length === 0 && clinicStrip.length === 0) return null;

  return (
    <>
      {/* Latest — 커버 포워드 3열 그리드 */}
      {latest.length > 0 && (
        <section className="border-y border-stone-200/70 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  {labels.latestOverline}
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
                  {labels.latestTitle}
                </h2>
              </div>
              <Link
                href={`/${lang}/blog`}
                className="text-xs font-bold uppercase tracking-[0.24em] text-stone-900 transition hover:text-stone-600"
              >
                {labels.viewAll} →
              </Link>
            </div>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${lang}/guides/${c.slug}`}
                  className="group flex flex-col gap-3"
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
                  <h3 className="text-[17px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-700">
                    {c.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Partner clinics — 4:5 커버 스트립 (국내 홈 파트너 스트립 미러) */}
      {clinicStrip.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                {labels.clinicsOverline}
              </div>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
                {labels.clinicsTitle}
              </h2>
            </div>
            <Link
              href={`/${lang}/clinics`}
              className="text-xs font-bold uppercase tracking-[0.24em] text-stone-900 transition hover:text-stone-600"
            >
              {labels.viewAll} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {clinicStrip.map((c) => (
              <Link
                key={c.partner_slug}
                href={`/${lang}/clinics/${c.category}/${c.partner_slug}`}
                className="group relative block aspect-[4/5] overflow-hidden bg-stone-200"
              >
                {c.cover_image_url && (
                  <Image
                    src={c.cover_image_url}
                    alt={c.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized
                    className="object-cover transition duration-[900ms] ease-out group-hover:scale-[1.04]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-sm font-bold leading-snug text-white">{c.name}</div>
                  {c.guides > 0 && (
                    <div className="mt-1 text-[11px] font-semibold text-stone-300">
                      {labels.guidesCount(c.guides)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
