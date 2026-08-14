import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { kakaoTrackHrefSelf } from "@/lib/ctaLink";

// Round 111 v3 (2026-07-02) — Editorial guide page.

export const metadata: Metadata = {
  title: "병원 입점 가이드 — 위서클",
  description:
    "위서클 파트너 병원이 되는 과정. 초기 상담 → 콘텐츠 편집 → 의료법 검수 → 발행 → 측정까지.",
  alternates: { canonical: "/guide" },
};

const STEPS = [
  {
    num: "01",
    overline: "Initial Talk",
    title: "무료 초기 상담",
    body: "병원의 진료 철학·시술 라인업·이미 갖고 있는 콘텐츠를 검토합니다. 카카오톡 상담부터 30분.",
    detail: "적합성 진단서 발송 · 예상 발행 물량 · 컴플라이언스 이슈 초안",
  },
  {
    num: "02",
    overline: "Editorial",
    title: "콘텐츠 편집 · 발행 계획",
    body: "위서클 편집팀이 병원별 톤·타깃·키워드 맵을 만들고 발행 주기를 설계합니다.",
    detail: "월간 아카이브 플랜 · 자사 인사이트 vs 파트너 콘텐츠 분리",
  },
  {
    num: "03",
    overline: "Compliance",
    title: "의료법 자동 린트 + 전문의 검수",
    body: "9개 의료광고 룰 자동 린트 → 전문의 검수 → 병원 확인. 이름을 걸 만한 문장만 발행됩니다.",
    detail: "허위 · 과대 · 비교 · 체험담 · 가격 표기 · 심의번호까지",
  },
  {
    num: "04",
    overline: "Publish",
    title: "AI 인용 대비 발행",
    body: "Schema.org 구조화 · FAQ · HowTo 로 발행합니다. AI 검색이 실제로 인용할 수 있는 형태로.",
    detail: "wecircle.co.kr 자사 URL · 네이버 인덱싱 · IndexNow · GSC 자동 제출",
  },
  {
    num: "05",
    overline: "Measurement",
    title: "AI 인용 측정 · 월간 리포트",
    body: "발행 URL 이 실제 AI 검색에서 얼마나 인용되는지 매월 리포트로 정리합니다.",
    detail: "Perplexity · ChatGPT · Gemini · Claude 4엔진 · 경쟁사 노출 · 액션 플랜",
  },
];

const FAQ = [
  { q: "계약 기간은 어떻게 되나요?", a: "월 단위 계약이 기본입니다. 3개월 이후 종료 시점을 자유롭게 선택할 수 있습니다." },
  { q: "우리 병원이 이미 홈페이지가 있어도 되나요?", a: "네. 위서클은 병원 홈페이지가 아니라 wecircle.co.kr 자사 URL 에 콘텐츠 자산을 축적합니다. 홈페이지는 그대로 두시고 별도 채널로 운영됩니다." },
  { q: "다른 병원과 콘텐츠가 겹치지 않나요?", a: "각 병원의 진료 철학 · 시술 근거 · 환자 사례에 기반해 편집하기 때문에 문장 · 이미지 · 관점 모두 병원별로 분리됩니다." },
  { q: "발행 물량은 정할 수 있나요?", a: "네. 초기 상담에서 월 발행 물량을 정합니다. 진료과와 예산에 따라 유연하게 조정됩니다." },
];

export default function GuidePage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "홈", href: "/" }, { name: "병원 입점 가이드", href: "/guide" }])} />

      <main className="bg-[#FAFAF7] text-stone-900">
        {/* Masthead */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-14 md:pt-24 md:pb-20 lg:px-10">
            <div className="flex items-baseline justify-between border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-6 bg-stone-400" />
                Partner Guide · 05 Steps
              </div>
              <span className="hidden md:inline">평균 착수 D+7</span>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              <h1 className="text-[38px] font-black leading-[1.08] tracking-[-0.025em] text-stone-950 md:text-[52px] xl:text-[58px]">
                병원이 위서클과 함께
                <br />
                <span className="font-serif italic font-normal text-stone-500">일하는 다섯 단계.</span>
              </h1>
              <p className="max-w-md text-[15px] leading-[1.75] text-stone-600 lg:pb-4">
                초기 상담부터 월간 리포트까지, 위서클이 어떻게 병원의 콘텐츠 자산을 편집·발행·측정하는지 순서대로 정리했습니다.
              </p>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="mb-12 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Workflow</h2>
              <span className="text-xs text-stone-500">5 steps · from talk to metric</span>
            </div>
            <ol className="divide-y divide-stone-200/70">
              {STEPS.map((s) => (
                <li key={s.num}>
                  <div className="grid grid-cols-[56px_1fr] items-start gap-6 py-10 md:grid-cols-[88px_minmax(0,3fr)_minmax(0,5fr)] md:gap-10">
                    <span className="font-serif text-4xl font-light tabular-nums leading-none text-stone-400 md:text-5xl">
                      {s.num}
                    </span>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                        {s.overline}
                      </div>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 md:text-[26px]">
                        {s.title}
                      </h3>
                    </div>
                    <div className="col-start-2 max-w-lg md:col-start-3">
                      <p className="text-[15px] leading-[1.75] text-stone-600">{s.body}</p>
                      <p className="mt-3 border-t border-stone-200/70 pt-3 text-[12px] tabular-nums text-stone-500">
                        {s.detail}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="mb-12 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Frequently Asked</h2>
              <span className="text-xs text-stone-500">4 questions</span>
            </div>
            <ol className="divide-y divide-stone-200/70">
              {FAQ.map((f, i) => (
                <li key={f.q} className="grid grid-cols-[48px_1fr] items-baseline gap-6 py-8 md:grid-cols-[64px_minmax(0,4fr)_minmax(0,6fr)] md:gap-10">
                  <span className="font-serif text-2xl font-light tabular-nums leading-none text-stone-400 md:text-3xl">
                    Q{i + 1}
                  </span>
                  <h3 className="text-[17px] font-bold leading-snug tracking-tight text-stone-950 md:text-[19px]">
                    {f.q}
                  </h3>
                  <p className="col-start-2 mt-2 text-[14px] leading-[1.75] text-stone-600 md:col-start-3 md:mt-0">
                    {f.a}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  <span className="inline-block h-px w-6 bg-stone-400" />
                  Get in touch
                </div>
                <h2 className="mt-5 font-serif text-3xl italic leading-tight text-stone-900 md:text-[40px]">
                  &ldquo;30분 상담부터 시작합니다.&rdquo;
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-stone-600">
                  카카오톡 채널로 편하게 문의해 주세요. 평균 D+7 안에 첫 콘텐츠가 발행됩니다.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:pl-8">
                <a
                  href={kakaoTrackHrefSelf()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
                >
                  <span className="text-sm font-bold tracking-tight">카카오톡으로 상담</span>
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
