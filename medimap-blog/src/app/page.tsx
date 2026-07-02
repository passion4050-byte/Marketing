import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { organizationLd, websiteLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";
import { getAllPartnerPosts } from "@/lib/partners";
import { siteConfig } from "@/lib/site";

// Round 111 v3 (2026-07-02) — Editorial home. Off-white magazine cover style.
export const revalidate = 60;

const CATEGORY_OVERLINE: Record<string, string> = {
  content_marketing: "Content Marketing",
  ai_trend: "AI & Search",
  hospital_marketing: "Hospital Marketing",
};

export default async function HomePage() {
  const [blogPosts, partnerPosts] = await Promise.all([getAllPosts(), getAllPartnerPosts()]);
  const featured = blogPosts.find((p) => p.featured) ?? blogPosts[0];
  const secondary = blogPosts.filter((p) => p.slug !== featured?.slug).slice(0, 3);
  const totalPosts = blogPosts.length + partnerPosts.length;
  const today = new Date();

  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd data={websiteLd()} />

      <main className="bg-[#FAFAF7] text-stone-900">
        {/* === Masthead === */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 pt-14 pb-12 md:pt-20 md:pb-16 lg:px-10">
            {/* Meta bar */}
            <div className="flex items-baseline justify-between border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-6 bg-stone-400" />
                <span>WECIRCLE Insights · Issue {today.getFullYear() - 2000}</span>
              </div>
              <time dateTime={today.toISOString()} className="hidden tabular-nums md:inline">
                {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </time>
            </div>

            {/* Hero grid */}
            <div className="mt-12 grid gap-10 md:gap-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              {/* Left — big statement */}
              <div>
                <h1 className="text-[42px] font-black leading-[1.02] tracking-[-0.025em] text-stone-950 md:text-[68px]">
                  검색이 검색을 벗어난 시대,
                  <br />
                  <span className="font-serif italic font-normal text-stone-500">병원이 남기는 문장.</span>
                </h1>
                <p className="mt-8 max-w-xl text-[15px] leading-[1.75] text-stone-600">
                  위서클은 의료법을 통과한 병원 콘텐츠를 편집·발행합니다. 광고 트래픽이 아니라 AI 검색이 인용하는 신뢰 자산을 만듭니다.
                </p>

                {/* Editorial CTA row */}
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    href="/with-partners"
                    className="group inline-flex items-center gap-3 border border-stone-900 bg-stone-900 px-6 py-4 text-white transition hover:bg-stone-800"
                  >
                    <span className="text-sm font-bold tracking-tight">파트너 콘텐츠 아카이브</span>
                    <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/blog"
                    className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-stone-900 hover:text-stone-600"
                  >
                    Read the Insights
                    <ArrowUpRight size={14} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {/* Right — Featured cover */}
              {featured ? (
                <Link href={`/blog/${featured.slug}`} className="group block">
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-200">
                    {featured.cover_image_url ? (
                      <Image
                        src={featured.cover_image_url}
                        alt={featured.cover_image_alt ?? featured.title}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover grayscale transition duration-[900ms] ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400">
                        <span className="text-[10px] font-bold uppercase tracking-widest">No cover</span>
                      </div>
                    )}
                    {/* Featured badge */}
                    <div className="absolute left-4 top-4 bg-stone-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-white">
                      Cover Story
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    {featured.blogCategory ? CATEGORY_OVERLINE[featured.blogCategory] ?? featured.blogCategory : "Insights"}
                    <span className="text-stone-300">·</span>
                    <span className="tabular-nums">{featured.readingMinutes} min</span>
                  </div>
                  <h2 className="mt-2 text-[22px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-600 md:text-[24px]">
                    {featured.title}
                  </h2>
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {/* === Value proposition — Editorial numbered index === */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="mb-12 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Why WECIRCLE</h2>
              <span className="text-xs text-stone-500">Three pillars</span>
            </div>

            <ol className="divide-y divide-stone-200/70">
              <PillarRow
                num="01"
                overline="AI Citation"
                title="AI 검색이 인용할 수 있게"
                body="Perplexity · ChatGPT · Gemini · Claude 가 실제로 인용할 수 있도록 Schema.org 구조화, FAQ, HowTo 로 발행합니다. 트래픽이 아니라 인용 횟수를 목표로 설계됩니다."
              />
              <PillarRow
                num="02"
                overline="Medical Compliance"
                title="의료법을 통과한 문장만"
                body="9개 의료광고 룰을 자동 린트하고 전문의가 검수합니다. 환자가 안심하고 읽을 수 있는 콘텐츠, 병원이 안심하고 걸어둘 수 있는 콘텐츠."
              />
              <PillarRow
                num="03"
                overline="Live Measurement"
                title="발행 이후를 측정합니다"
                body="발행 URL 의 AI 인용 빈도, 페이지뷰, 클릭 전환율을 한 화면에서 확인합니다. 감이 아니라 데이터로 다음 콘텐츠를 결정합니다."
              />
            </ol>
          </div>
        </section>

        {/* === Latest insights === */}
        {secondary.length > 0 && (
          <section className="border-b border-stone-200/70">
            <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
              <div className="mb-12 flex items-baseline justify-between border-b border-stone-300 pb-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Latest Reads</h2>
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-stone-900 hover:text-stone-600"
                >
                  Full archive
                  <ArrowUpRight size={13} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="grid gap-12 md:grid-cols-3 md:gap-10">
                {secondary.map((post) => (
                  <ArticleCard key={post.slug} post={post} variant="default" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* === Partner directory teaser === */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  <span className="inline-block h-px w-6 bg-stone-400" />
                  Partner Network
                </div>
                <h2 className="mt-6 text-[36px] font-black leading-[1.1] tracking-[-0.02em] text-stone-950 md:text-[48px]">
                  같이 걷는 <br />
                  <span className="font-serif italic font-normal text-stone-500">병원들.</span>
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-stone-600">
                  안과·피부과·성형외과·치과·내과·모발이식·한방 7개 진료과에서 함께하는 파트너 병원의 검증된 콘텐츠.
                </p>
                <Link
                  href="/with-partners"
                  className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-stone-900 hover:text-stone-600"
                >
                  Browse the directory
                  <ArrowUpRight size={13} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Right — stat gallery */}
              <dl className="grid grid-cols-3 gap-6 border-t border-stone-300 pt-8">
                <StatCell overline="Categories" value="07" caption="진료과" />
                <StatCell overline="Published" value={totalPosts.toLocaleString()} caption="누적 콘텐츠" />
                <StatCell overline="Compliance" value="100%" caption="의료법 통과" />
              </dl>
            </div>
          </div>
        </section>

        {/* === Contact CTA === */}
        <section>
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-28 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  <span className="inline-block h-px w-6 bg-stone-400" />
                  Get in touch
                </div>
                <h2 className="mt-5 font-serif text-3xl italic leading-tight text-stone-900 md:text-[40px]">
                  &ldquo;병원의 이야기를,
                  <br />
                  AI 가 인용하는 자산으로.&rdquo;
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-stone-600">
                  콘텐츠 편집·의료법 검수·측정까지, 위서클이 한 파이프라인에서 진행합니다. 파트너십 문의는 카카오톡 상담이 가장 빠릅니다.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href={siteConfig.contact.kakao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
                >
                  <span className="text-sm font-bold tracking-tight">카카오톡 상담 시작</span>
                  <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <Link
                  href="/contact"
                  className="group inline-flex items-center justify-between gap-4 border border-stone-300 bg-white px-6 py-5 text-stone-900 transition hover:border-stone-900"
                >
                  <span className="text-sm font-bold tracking-tight">서면 제휴 문의</span>
                  <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function PillarRow({
  num,
  overline,
  title,
  body,
}: {
  num: string;
  overline: string;
  title: string;
  body: string;
}) {
  return (
    <li>
      <div className="grid grid-cols-[56px_1fr] items-start gap-6 py-10 md:grid-cols-[88px_minmax(0,3fr)_minmax(0,5fr)] md:gap-10">
        <span className="font-serif text-4xl font-light tabular-nums leading-none text-stone-400 md:text-5xl">
          {num}
        </span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
            {overline}
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 md:text-[28px]">
            {title}
          </h3>
        </div>
        <p className="col-start-2 max-w-lg text-[15px] leading-[1.75] text-stone-600 md:col-start-3 md:mt-0">
          {body}
        </p>
      </div>
    </li>
  );
}

function StatCell({ overline, value, caption }: { overline: string; value: string; caption: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">
        {overline}
      </dt>
      <dd className="mt-2 text-3xl font-black tabular-nums text-stone-950 md:text-[42px]">
        {value}
      </dd>
      <div className="mt-1 text-[11px] text-stone-500">{caption}</div>
    </div>
  );
}
