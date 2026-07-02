import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd, organizationLd } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

// Round 111 v3 (2026-07-02) — Editorial about page.

export const metadata: Metadata = {
  title: "회사소개 — 위서클",
  description:
    "위서클은 AI 검색 시대에 병원이 살아남는 방식을 다시 씁니다. 편집·의료법·측정을 한 파이프라인에서.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { num: "01", overline: "Editorial", title: "광고가 아니라 편집.", body: "위서클은 병원의 진료 철학·시술 근거·환자 사례를 편집합니다. 노출을 사는 대신, 문장을 남깁니다." },
  { num: "02", overline: "Compliance", title: "의료법이 먼저.", body: "9개 의료광고 룰을 자동 린트하고 전문의가 검수합니다. 병원의 이름을 걸 만한 문장만 발행됩니다." },
  { num: "03", overline: "AI Citation", title: "AI 가 인용할 수 있게.", body: "Perplexity · ChatGPT · Gemini · Claude 가 인용할 수 있도록 Schema.org 구조화, FAQ, HowTo 로 발행합니다." },
  { num: "04", overline: "Measurement", title: "발행 이후를 측정합니다.", body: "AI 인용 빈도, 페이지뷰, 클릭 전환율을 한 화면에서 확인합니다. 감이 아니라 데이터로 다음 콘텐츠를 결정합니다." },
];

const TIMELINE = [
  { year: "2024", label: "위서클 편집팀 시작", body: "의료 콘텐츠 편집·의료법 검수·AEO 방법론 정립." },
  { year: "2025", label: "AI 인용 측정 시스템", body: "4대 AI 엔진 grounding 데이터 실시간 수집 인프라." },
  { year: "2026", label: "파트너 병원 네트워크", body: "7개 진료과 파트너 병원의 아카이브 오픈. 위서클 인사이트 정규 발행." },
];

export default function AboutPage() {
  const today = new Date();
  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd data={breadcrumbLd([{ name: "홈", href: "/" }, { name: "회사소개", href: "/about" }])} />

      <main className="bg-[#FAFAF7] text-stone-900">
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-14 md:pt-24 md:pb-20 lg:px-10">
            <div className="flex items-baseline justify-between border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-6 bg-stone-400" />
                About WECIRCLE
              </div>
              <time className="hidden tabular-nums md:inline">
                {today.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
              </time>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              <h1 className="text-[42px] font-black leading-[1.05] tracking-[-0.025em] text-stone-950 md:text-[64px]">
                검색이 검색을 벗어난 시대,
                <br />
                <span className="font-serif italic font-normal text-stone-500">병원이 남길 문장을 편집합니다.</span>
              </h1>
              <p className="max-w-md text-[15px] leading-[1.75] text-stone-600 lg:pb-4">
                위서클은 병원의 진료 철학과 근거를 <em className="font-serif not-italic text-stone-900">의료법을 통과한 콘텐츠 자산</em>으로 재편집합니다. AI 검색 시대에 병원이 신뢰받는 방식을 다시 씁니다.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="mb-12 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Principles</h2>
              <span className="text-xs text-stone-500">Four commitments</span>
            </div>
            <ol className="divide-y divide-stone-200/70">
              {PRINCIPLES.map((p) => (
                <li key={p.num}>
                  <div className="grid grid-cols-[56px_1fr] items-start gap-6 py-10 md:grid-cols-[88px_minmax(0,3fr)_minmax(0,5fr)] md:gap-10">
                    <span className="font-serif text-4xl font-light tabular-nums leading-none text-stone-400 md:text-5xl">
                      {p.num}
                    </span>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                        {p.overline}
                      </div>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 md:text-[28px]">
                        {p.title}
                      </h3>
                    </div>
                    <p className="col-start-2 max-w-lg text-[15px] leading-[1.75] text-stone-600 md:col-start-3">
                      {p.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="mb-12 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Chronology</h2>
              <span className="text-xs text-stone-500">Since 2024</span>
            </div>
            <ol className="divide-y divide-stone-200/70">
              {TIMELINE.map((t) => (
                <li key={t.year}>
                  <div className="grid grid-cols-[80px_1fr] items-baseline gap-6 py-8 md:grid-cols-[120px_minmax(0,3fr)_minmax(0,5fr)] md:gap-10">
                    <span className="font-serif text-3xl font-light tabular-nums leading-none text-stone-900 md:text-4xl">
                      {t.year}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-stone-950 md:text-2xl">
                        {t.label}
                      </h3>
                    </div>
                    <p className="col-start-2 mt-2 max-w-md text-[14px] leading-[1.75] text-stone-600 md:col-start-3 md:mt-0">
                      {t.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section>
          <div className="mx-auto w-full max-w-[1280px] px-6 py-24 md:py-32 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  <span className="inline-block h-px w-6 bg-stone-400" />
                  Manifesto
                </div>
                <blockquote className="mt-6 font-serif text-3xl italic leading-tight text-stone-900 md:text-[44px]">
                  &ldquo;병원의 이야기를,
                  <br />
                  AI 가 인용할 수 있는 자산으로.&rdquo;
                </blockquote>
                <p className="mt-6 max-w-lg text-[15px] leading-[1.75] text-stone-600">
                  위서클 편집팀, {today.getFullYear()}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:pl-8">
                <a
                  href={siteConfig.contact.kakao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
                >
                  <span className="text-sm font-bold tracking-tight">카카오톡 상담</span>
                  <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <Link
                  href="/guide"
                  className="group inline-flex items-center justify-between gap-4 border border-stone-300 bg-white px-6 py-5 text-stone-900 transition hover:border-stone-900"
                >
                  <span className="text-sm font-bold tracking-tight">병원 입점 가이드</span>
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
