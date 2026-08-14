import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MessageCircle, Mail, MapPin } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

// Round 111 v3 (2026-07-02) — Editorial contact page.

export const metadata: Metadata = {
  title: "제휴 문의 — 위서클",
  description:
    "위서클 파트너십 · 제휴 문의. 카카오톡 상담이 가장 빠릅니다. 서면 문의는 이메일로.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    num: "01",
    overline: "Kakao",
    title: "카카오톡 상담",
    body: "가장 빠른 채널. 평일 10:00–19:00 실시간 응답, 그 외 시간은 다음 영업일 첫 응답.",
    ctaLabel: "카카오톡 열기",
    href: siteConfig.contact.kakao,
    external: true,
    Icon: MessageCircle,
  },
  {
    num: "02",
    overline: "Email",
    title: "서면 문의",
    body: "제안서 · 계약 조건 · 컴플라이언스 문서가 필요한 문의는 이메일이 편합니다. 영업일 1–2일 내 회신.",
    ctaLabel: "메일 보내기",
    href: "mailto:passion4050@gmail.com",
    external: false,
    Icon: Mail,
  },
];

const HOURS = [
  { day: "평일", hours: "10:00 – 19:00" },
  { day: "토요일", hours: "휴무" },
  { day: "일요일 · 공휴일", hours: "휴무" },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "홈", href: "/" }, { name: "제휴 문의", href: "/contact" }])} />

      <main className="bg-[#FAFAF7] text-stone-900">
        {/* Masthead */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-14 md:pt-24 md:pb-20 lg:px-10">
            <div className="flex items-baseline justify-between border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-6 bg-stone-400" />
                Contact WECIRCLE
              </div>
              <span className="hidden md:inline">응답 D+1</span>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              <h1 className="text-[38px] font-black leading-[1.08] tracking-[-0.025em] text-stone-950 md:text-[52px] xl:text-[58px]">
                한 문장의 상담으로,
                <br />
                <span className="font-serif italic font-normal text-stone-500">시작할 수 있습니다.</span>
              </h1>
              <p className="max-w-md text-[15px] leading-[1.75] text-stone-600 lg:pb-4">
                병원 · 의료기관 · 제휴 · 컴플라이언스 관련 문의는 아래 채널로 보내주세요. 위서클 파트너십 팀이 직접 응답합니다.
              </p>
            </div>
            {/* Round 145c (감사 #21) — 실적 스트립: 신뢰 요소를 문의 진입점에 노출 */}
            <p className="mt-6 text-[12.5px] tracking-tight text-stone-500">
              7개 진료과 파트너 아카이브 · 발행 콘텐츠 200편+ · 전 콘텐츠 의료광고법 검수
            </p>
          </div>
        </section>

        {/* Channels */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="mb-12 flex items-baseline justify-between border-b border-stone-300 pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Channels</h2>
              <span className="text-xs text-stone-500">두 가지 방법</span>
            </div>

            <ol className="divide-y divide-stone-200/70">
              {CHANNELS.map((c) => (
                <li key={c.num}>
                  <a
                    href={c.href}
                    target={c.external ? "_blank" : undefined}
                    rel={c.external ? "noopener noreferrer" : undefined}
                    className="group grid grid-cols-[56px_1fr_auto] items-start gap-6 py-10 md:grid-cols-[88px_minmax(0,3fr)_minmax(0,4fr)_auto] md:gap-10"
                  >
                    <span className="font-serif text-4xl font-light tabular-nums leading-none text-stone-400 transition group-hover:text-stone-900 md:text-5xl">
                      {c.num}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                        <c.Icon size={12} strokeWidth={1.75} />
                        {c.overline}
                      </div>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 md:text-[26px]">
                        {c.title}
                      </h3>
                    </div>
                    <p className="col-start-2 max-w-md text-[15px] leading-[1.75] text-stone-600 md:col-start-3">
                      {c.body}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500 transition group-hover:text-stone-900">
                      {c.ctaLabel}
                      <ArrowUpRight size={13} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Hours + Company */}
        <section className="border-b border-stone-200/70">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
            <div className="grid gap-12 md:grid-cols-2 md:gap-16">
              <div>
                <div className="mb-4 flex items-baseline justify-between border-b border-stone-300 pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Hours</h2>
                  <span className="text-xs text-stone-500">KST</span>
                </div>
                <dl className="divide-y divide-stone-200/70">
                  {HOURS.map((h) => (
                    <div key={h.day} className="flex items-baseline justify-between py-4">
                      <dt className="text-[14px] text-stone-700">{h.day}</dt>
                      <dd className="font-serif tabular-nums text-[17px] text-stone-950">
                        {h.hours}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <div className="mb-4 flex items-baseline justify-between border-b border-stone-300 pb-3">
                  <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">Company</h2>
                  <span className="text-xs text-stone-500">Publisher</span>
                </div>
                <dl className="space-y-4">
                  <Row label="법인명" value={siteConfig.publisher.legalName} />
                  <Row
                    label="주소"
                    value={siteConfig.contact.address}
                    icon={<MapPin size={12} strokeWidth={1.75} />}
                  />
                  <Row label="사업자등록번호" value={siteConfig.contact.businessNumber} mono />
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                  <span className="inline-block h-px w-6 bg-stone-400" />
                  Explore
                </div>
                <h2 className="mt-5 font-serif text-3xl italic leading-tight text-stone-900 md:text-[40px]">
                  &ldquo;문의 전에 먼저 읽어보세요.&rdquo;
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/guide"
                  className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
                >
                  <span className="text-sm font-bold tracking-tight">병원 입점 가이드</span>
                  <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/with-partners"
                  className="group inline-flex items-center justify-between gap-4 border border-stone-300 bg-white px-6 py-5 text-stone-900 transition hover:border-stone-900"
                >
                  <span className="text-sm font-bold tracking-tight">파트너 아카이브</span>
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

function Row({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-stone-200/70 py-3">
      <dt className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-500">
        {icon} {label}
      </dt>
      <dd className={`text-right text-[14px] text-stone-800 ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
