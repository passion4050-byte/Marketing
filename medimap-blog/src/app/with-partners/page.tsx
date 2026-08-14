import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { PARTNER_CATEGORIES, getAllPartnerPosts } from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { kakaoTrackHrefSelf } from "@/lib/ctaLink";

// Round 111 v2 (2026-07-02) — editorial magazine index. 3-col grid 폐기, numbered directory,
// hairline dividers, cover image preview on hover, warm off-white palette, controlled scale.
// Round 129 — SEO/CWV: force-dynamic → ISR 60s
export const revalidate = 60;

export const metadata: Metadata = {
  title: "파트너 병원 콘텐츠 — 위서클",
  description:
    "안과·피부과·성형외과·치과·내과·모발이식·한방. 위서클과 함께하는 파트너 병원의 의료법을 통과한 콘텐츠.",
  alternates: { canonical: absoluteUrl("/with-partners") },
  openGraph: {
    title: "파트너 병원 콘텐츠 — 위서클",
    url: absoluteUrl("/with-partners"),
    siteName: siteConfig.name,
    type: "website",
  },
};

const CATEGORY_COPY: Record<string, { subtitle: string; overline: string }> = {
  eyeclinic:  { overline: "Ophthalmology", subtitle: "라식·라섹·스마일라식·백내장" },
  derma:      { overline: "Dermatology",   subtitle: "여드름·색소·레이저·필러·보톡스" },
  plastic:    { overline: "Plastic Surgery", subtitle: "안면윤곽·가슴·코·양악·쌍꺼풀" },
  dental:     { overline: "Dental",        subtitle: "임플란트·교정·미백·신경치료" },
  internal:   { overline: "Internal Medicine", subtitle: "건강검진·내시경·갑상선·당뇨" },
  hair:       { overline: "Hair Transplant", subtitle: "FUT 절개·FUE 비절개·헤어라인" },
  oriental:   { overline: "Oriental Medicine", subtitle: "한약·체형교정·다이어트·통증" },
};

export default async function WithPartnersHubPage() {
  const all = await getAllPartnerPosts();

  const countByCategory = new Map<string, number>();
  const coverByCategory = new Map<string, string | null>();
  for (const p of all) {
    countByCategory.set(p.partner_category, (countByCategory.get(p.partner_category) ?? 0) + 1);
    if (!coverByCategory.has(p.partner_category) && p.cover_image_url) {
      coverByCategory.set(p.partner_category, p.cover_image_url);
    }
  }

  const total = all.length;
  const activeCategories = Array.from(countByCategory.entries()).filter(([, c]) => c > 0).length;

  return (
    <main className="bg-[#FAFAF7] text-stone-900">
      {/* === Editorial masthead === */}
      <section className="border-b border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-10 md:pt-24 md:pb-14 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                <span className="inline-block h-px w-6 bg-stone-400" />
                Partner Network · Issue 07
              </div>
              <h1 className="mt-6 text-[38px] font-black leading-[1.08] tracking-[-0.02em] text-stone-950 md:text-[52px]">
                같이 걷는 병원들.
                <br />
                <span className="text-stone-400">한 자리에서 만나는</span>{" "}
                검증된 의료 콘텐츠.
              </h1>
            </div>

            {/* Right column — sub-copy + minimal stats */}
            <div className="lg:pb-2">
              <p className="max-w-md text-[15px] leading-[1.75] text-stone-600">
                안과·피부과·성형외과·치과·내과·모발이식·한방 — 위서클이 발행하는 파트너 병원 콘텐츠는 의료법 가이드를 통과한 정직한 정보만 다룹니다.
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-stone-200/80 pt-6">
                <StatCell label="Categories" value={String(PARTNER_CATEGORIES.length)} />
                <StatCell label="Active" value={`${activeCategories} / ${PARTNER_CATEGORIES.length}`} />
                <StatCell label="Published" value={total.toLocaleString()} />
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* === Directory (numbered magazine index) === */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-16 md:py-24 lg:px-10">
        <div className="mb-10 flex items-baseline justify-between border-b border-stone-300 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">
            Directory
          </h2>
          <span className="text-xs text-stone-500">진료과별 콘텐츠 아카이브</span>
        </div>

        <ol className="divide-y divide-stone-200/70">
          {PARTNER_CATEGORIES.map((cat, i) => {
            const count = countByCategory.get(cat.slug) ?? 0;
            const cover = coverByCategory.get(cat.slug) ?? null;
            const isEmpty = count === 0;
            const copy = CATEGORY_COPY[cat.slug] ?? {
              overline: cat.slug,
              subtitle: cat.description,
            };
            const num = String(i + 1).padStart(2, "0");

            return (
              <li key={cat.slug} className="group relative">
                <Link
                  href={`/with-partners/${cat.slug}`}
                  className="grid grid-cols-[64px_1fr_auto] items-center gap-6 py-8 transition md:grid-cols-[88px_minmax(0,1fr)_minmax(0,240px)_auto] md:gap-10 md:py-10"
                >
                  {/* Numeral */}
                  <span className="font-serif text-4xl font-light tabular-nums leading-none text-stone-400 transition group-hover:text-stone-900 md:text-5xl">
                    {num}
                  </span>

                  {/* Title + subtitle */}
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                      {copy.overline}
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-3">
                      <h3 className="text-2xl font-bold tracking-tight text-stone-950 transition group-hover:text-stone-900 md:text-[28px]">
                        {cat.ko}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                      {copy.subtitle}
                    </p>
                  </div>

                  {/* Cover preview — desktop only */}
                  <div className="hidden md:block">
                    {cover ? (
                      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-sm bg-stone-100 transition duration-500 group-hover:scale-[1.02]">
                        <Image
                          src={cover}
                          alt=""
                          fill
                          sizes="240px"
                          className="object-cover grayscale transition duration-700 group-hover:grayscale-0"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[3/2] w-full items-center justify-center rounded-sm border border-dashed border-stone-200 bg-stone-50 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                        Coming soon
                      </div>
                    )}
                  </div>

                  {/* Count + arrow */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-black tabular-nums leading-none ${isEmpty ? "text-stone-300" : "text-stone-950"}`}>
                        {count}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        posts
                      </span>
                    </div>
                    <ArrowUpRight
                      size={22}
                      strokeWidth={1.5}
                      className="text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-900"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {/* === Editorial partner CTA === */}
      <section className="border-t border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-28 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                <span className="inline-block h-px w-6 bg-stone-400" />
                Become a Partner
              </div>
              <h2 className="mt-5 text-[32px] font-black leading-[1.15] tracking-[-0.015em] text-stone-950 md:text-[44px]">
                병원의 이야기를,
                <br />
                AI 검색 시대의 <span className="italic font-serif font-normal text-stone-600">자산</span>으로.
              </h2>
              <p className="mt-6 max-w-lg text-[15px] leading-[1.75] text-stone-600">
                위서클은 병원의 진료 철학·시술 근거·환자 사례를 의료법을 통과한 콘텐츠 자산으로 재편집합니다. AI 검색엔진에 인용되는 데이터가 됩니다.
              </p>
            </div>
            <div className="lg:pl-6">
              <a
                href={kakaoTrackHrefSelf()}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
              >
                <span className="text-sm font-bold tracking-tight">카카오톡으로 상담 신청</span>
                <ArrowUpRight size={18} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              <p className="mt-3 text-xs text-stone-500">
                평일 10:00–19:00 · 위서클 파트너십 팀 응답
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">
        {label}
      </dt>
      <dd className="mt-2 text-xl font-black tabular-nums text-stone-950">
        {value}
      </dd>
    </div>
  );
}
