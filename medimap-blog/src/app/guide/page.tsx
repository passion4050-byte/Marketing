import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Users,
  ClipboardList,
  Star,
  Quote,
  FileDown,
  Sparkles,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { AboutInquiryForm } from "@/components/AboutInquiryForm";
import { breadcrumbLd, organizationLd } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

export const revalidate = false;

export const metadata: Metadata = {
  title: "병원 입점 가이드 | 메디맵",
  description:
    "메디맵 입점부터 환자 유치, 운영 관리까지 — 병원이 디지털 헬스케어 플랫폼에서 안정적으로 성장하기 위한 가이드. 검증된 DB, 병원 성장 지원, 지속적인 신규 환자 유입.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "병원 입점 가이드 | 메디맵",
    description:
      "메디맵 입점부터 환자 유치, 운영 관리까지 — 병원이 디지털 헬스케어 플랫폼에서 안정적으로 성장하기 위한 가이드.",
    type: "website",
  },
};

export default function GuidePage() {
  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "병원 입점 가이드", href: "/guide" },
        ])}
      />

      <PageHeader />
      <SpecialFeature />
      <WhyMedimap />
      <HowToStart />
      <PartnerReviews />
      <PartnerCta />
    </>
  );
}

/* ────────────────── Header ────────────────── */

function PageHeader() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-brand-mesh opacity-70" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 h-[320px] bg-gradient-to-b from-white/0 via-brand-50/30 to-white"
        aria-hidden
      />
      <div className="container-content relative pt-16 pb-6 md:pt-20">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
          Hospital Onboarding Guide
        </div>
        <h1 className="mt-3 max-w-3xl text-[36px] font-extrabold leading-[1.15] tracking-[-0.025em] text-ink md:text-[46px]">
          메디맵에 입점하고
          <br className="hidden md:block" />{" "}
          <span className="bg-gradient-to-br from-brand to-accent bg-clip-text text-transparent">
            함께 성장하는
          </span>{" "}
          가장 빠른 길
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted">
          입점 절차부터 환자 유치, 운영 관리까지 — 병원이 메디맵에서 안정적으로
          성장하기 위해 알아야 할 모든 것.
        </p>
        <div
          className="mt-8 h-[2px] w-full max-w-[120px] rounded-full bg-gradient-to-r from-brand to-accent"
          aria-hidden
        />
      </div>
    </section>
  );
}

/* ────────────────── 1. 메디맵만의 특별함 (이벤트) ────────────────── */

function SpecialFeature() {
  return (
    <section className="container-content py-20">
      <header className="mx-auto max-w-2xl text-center">
        <span className="pill-label">핵심 서비스</span>
        <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
          메디맵만의 특별함
        </h2>
        <p className="mt-3 text-ink-muted pretty-text">
          메디맵은 단순한 &lsquo;가격 비교 플랫폼&rsquo;이 아닙니다. 국내
          병·의원 정보를 원하는 방식으로 탐색하고, 올바른 선택을 돕는 가이드
          역할을 합니다.
        </p>
      </header>

      <div className="mt-12 grid items-center gap-12 md:grid-cols-[0.85fr_1.15fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <EventPhoneMockup />
        </div>
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
            <Calendar size={14} />
            Event
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight">
            이벤트 — 한눈에 확인할 수 있는 다양한 이벤트
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            등록한 이벤트는 메디맵 사용자에게 카테고리·지역·관심사 기반으로
            노출되어 신규 환자 유입을 안정적으로 만듭니다.
          </p>
          <ul className="mt-5 space-y-2.5">
            {[
              "예약 가능 시간/잔여 슬롯을 실시간 노출",
              "이벤트별 클릭/문의 수치 운영자 대시보드 제공",
              "캠페인 종료 시 자동 비활성 — 의료법 광고 표현 가드 적용",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 text-[14.5px] leading-relaxed text-ink-muted"
              >
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-brand to-accent" />
                {line}
              </li>
            ))}
          </ul>
          <Link
            href="#partner-cta"
            className="mt-7 inline-flex items-center gap-2 rounded-pill bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            자세히 알아보기
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function EventPhoneMockup() {
  const events = [
    { tag: "라식", title: "강남 OO안과 라식 이벤트", price: "229만원" },
    { tag: "스마일", title: "잠실 OO안과 스마일 라식", price: "75만원" },
    { tag: "치과", title: "분당 OO치과 셀프케어", price: "20만원" },
    { tag: "피부", title: "서울 OOO 피부과 5인 한정", price: "5,000원" },
  ];
  return (
    <div className="relative aspect-[3/4.4] w-full">
      <div className="absolute -inset-5 rotate-2 rounded-[34px] bg-gradient-to-br from-accent-50 via-brand-50 to-brand-100/60 blur-2xl" />
      <div
        className="relative h-full w-full overflow-hidden rounded-[30px] border border-line/70 bg-white shadow-card"
        aria-hidden
      >
        <div className="absolute left-1/2 top-2.5 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/10" />
        <div className="flex h-full flex-col gap-2.5 p-4 pt-10">
          <div className="flex items-center justify-between rounded-full bg-surface-alt px-3 py-2">
            <span className="text-[11px] font-bold text-ink">이벤트</span>
            <span className="text-[11px] font-semibold text-ink-subtle">
              가까운
            </span>
          </div>
          {events.map((e, i) => (
            <div
              key={e.title}
              className={`flex items-center gap-3 rounded-card border p-2.5 ${
                i === 0
                  ? "border-brand-200 bg-brand-50/60"
                  : "border-line/70 bg-white"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-[10px] font-bold ${
                  i === 0
                    ? "bg-brand text-white"
                    : "bg-surface-alt text-ink-muted"
                }`}
              >
                {e.tag}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[10.5px] font-semibold text-ink">
                  {e.title}
                </span>
                <span
                  className={`mt-0.5 text-[11px] font-bold num ${
                    i === 0 ? "text-brand" : "text-ink-muted"
                  }`}
                >
                  {e.price}
                </span>
              </div>
              <ArrowRight size={11} className="text-ink-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────── 2. 왜 메디맵일까? ────────────────── */

function WhyMedimap() {
  const items = [
    {
      icon: <ShieldCheck size={26} />,
      title: "검증된 DB",
      desc: "신뢰할 수 있는 데이터 기반, 의료 정보 검증을 거친 안전한 환경 제공.",
    },
    {
      icon: <TrendingUp size={26} />,
      title: "병원 성장 지원",
      desc: "브랜딩 광고를 통해 병원 가치 향상과 자산 형성을 도와드립니다.",
    },
    {
      icon: <Users size={26} />,
      title: "지속적인 신규 유입",
      desc: "검증된 DB 활용하여 B2C와 B2B 서비스 동시 제공으로 안정적인 신규 고객 유입.",
    },
  ];
  return (
    <section className="bg-surface-alt/60 py-20">
      <div className="container-content">
        <header className="mx-auto max-w-2xl text-center">
          <span className="pill-label">성장하는 플랫폼</span>
          <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
            왜 <span className="text-brand">메디맵</span>일까?
          </h2>
          <p className="mt-3 text-ink-muted pretty-text">
            혁신적인 디지털 헬스케어 플랫폼으로 더 많은 사람들에게 더 나은 의료
            서비스를 제공합니다.
          </p>
        </header>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="group flex flex-col items-center rounded-card border border-line/70 bg-white p-7 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-card"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-accent-50 text-brand transition group-hover:from-brand group-hover:to-accent group-hover:text-white">
                {it.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-ink">
                {it.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
                {it.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────── 3. 어떻게 시작하나요? ────────────────── */

function HowToStart() {
  return (
    <section className="container-content py-20">
      <header className="mx-auto max-w-2xl text-center">
        <span className="pill-label">병원 입점 가이드</span>
        <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
          어떻게 시작하나요?
        </h2>
        <p className="mt-3 text-ink-muted pretty-text">
          간단하고 빠르게 입점 문의가 가능합니다.
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-card border border-line/70 bg-white p-7 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-brand-50 text-brand">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
                Step 01
              </div>
              <h3 className="text-lg font-bold tracking-tight">간편한 병원 등록</h3>
            </div>
          </div>
          <FormPreviewMock />
          <p className="mt-5 text-[14px] leading-relaxed text-ink-muted">
            아래 버튼 클릭 후, 메디맵 입점문의 신청서를 작성해주세요.
          </p>
          <Link
            href="#partner-cta"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-pill bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:shadow-glow"
          >
            입점 문의하기
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col rounded-card border border-line/70 bg-white p-7 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-accent-50 text-accent">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-700">
                Step 02
              </div>
              <h3 className="text-lg font-bold tracking-tight">
                고객 관리 &amp; 성장
              </h3>
            </div>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">
            실시간 데이터로 고객 관리부터 병원의 성장을 확인하세요.
          </p>
          <DashboardPreviewMock />
          <Link
            href={siteConfig.contact.kakao}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-pill border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink-muted transition hover:border-brand-200 hover:text-brand"
          >
            메디맵 파트너 관리 바로가기
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FormPreviewMock() {
  return (
    <div className="mt-5 rounded-card border border-line/60 bg-surface-alt/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-ink">메디맵 입점문의</span>
        <span className="text-[10px] text-ink-subtle num">1/3 단계</span>
      </div>
      <div className="space-y-2">
        <div className="rounded-md border border-line/60 bg-white px-3 py-2 text-[11px] text-ink-subtle">
          병원명
        </div>
        <div className="rounded-md border border-line/60 bg-white px-3 py-2 text-[11px] text-ink-subtle">
          진료 과목
        </div>
        <div className="rounded-md border border-brand-200 bg-white px-3 py-2 text-[11px] font-semibold text-brand-700">
          010-****-****
        </div>
        <div className="flex items-center gap-2 px-1 pt-1 text-[10.5px] text-ink-muted">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand" />
          이용약관 동의
        </div>
        <div className="flex items-center gap-2 px-1 text-[10.5px] text-ink-muted">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand" />
          개인정보 수집 동의
        </div>
      </div>
    </div>
  );
}

function DashboardPreviewMock() {
  return (
    <div className="mt-5 rounded-card border border-line/60 bg-surface-alt/60 p-4">
      <div className="flex items-center justify-between rounded-md bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Users size={11} />
          </span>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold text-ink">신규 환자 유입</div>
            <div className="text-[10px] text-ink-subtle">이번 달</div>
          </div>
        </div>
        <span className="text-[12px] font-bold text-brand num">+250</span>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-md bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-50 text-accent">
            <TrendingUp size={11} />
          </span>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold text-ink">월 매출 성장</div>
            <div className="text-[10px] text-ink-subtle">지난 3개월</div>
          </div>
        </div>
        <span className="text-[12px] font-bold text-accent num">↑ 32%</span>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-md bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand">
            <Calendar size={11} />
          </span>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold text-ink">예약 건수</div>
            <div className="text-[10px] text-ink-subtle">이번 달</div>
          </div>
        </div>
        <span className="text-[12px] font-bold text-brand num">+180</span>
      </div>
    </div>
  );
}

/* ────────────────── 4. 파트너 후기 ────────────────── */

function PartnerReviews() {
  const reviews = [
    {
      stars: 5,
      quote:
        "메디맵을 통해 병원 홍보와 환자 유입이 눈에 띄게 늘었습니다. 특히 브랜딩 광고 효과가 뛰어나 병원 인지도가 크게 상승했어요.",
      name: "강남 OO 성형외과",
      role: "성형외과",
    },
    {
      stars: 5,
      quote:
        "검증된 DB를 기반으로 한 신규 환자 유치가 안정적으로 이루어지고 있습니다. 메디맵의 협업은 최고의 선택이었습니다.",
      name: "서울 OOO 피부과",
      role: "피부과",
    },
    {
      stars: 5,
      quote:
        "메디맵 덕분에 마케팅에만 집중하던 시간을 환자 진료에 쓸 수 있게 되었어요. 진정한 파트너십을 느낍니다.",
      name: "분당 OOOO 치과",
      role: "치과",
    },
  ];

  return (
    <section className="bg-surface-alt/60 py-20">
      <div className="container-content">
        <header className="mx-auto max-w-2xl text-center">
          <span className="pill-label">파트너 병원 이야기</span>
          <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
            실제 <span className="text-brand">파트너</span>의 생생한 후기
          </h2>
          <p className="mt-3 text-ink-muted pretty-text">
            메디맵과 함께 성장하고 있는 파트너 병원들의 이야기를 들어보세요.
          </p>
        </header>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {reviews.map((r) => (
            <article
              key={r.name}
              className="relative flex flex-col rounded-card border border-line/70 bg-white p-7 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <Quote
                size={28}
                className="absolute right-6 top-6 text-brand-100"
                aria-hidden
              />
              <div className="flex items-center gap-1">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className="fill-accent text-accent"
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">
                &ldquo;{r.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-line/70 pt-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-accent-100 text-sm font-bold text-brand-700">
                  {r.name.slice(0, 1)}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-ink">{r.name}</div>
                  <div className="text-[12px] text-ink-subtle">{r.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────── 5. CTA + PDF 다운로드 ────────────────── */

function PartnerCta() {
  return (
    <section
      id="partner-cta"
      className="relative isolate overflow-hidden bg-gradient-to-br from-brand via-brand-600 to-accent py-20"
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(at 15% 20%, rgba(255,255,255,0.35) 0px, transparent 50%), radial-gradient(at 85% 80%, rgba(255,255,255,0.20) 0px, transparent 50%)",
        }}
        aria-hidden
      />
      <div className="container-content relative">
        <header className="mx-auto max-w-2xl text-center text-white">
          <span className="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
            <Sparkles size={12} />
            함께하세요
          </span>
          <h2 className="mt-5 text-[32px] font-extrabold leading-[1.18] tracking-[-0.02em] balance-text md:text-[40px]">
            디지털 헬스케어의 미래를
            <br />
            함께 만들어가세요
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            메디맵과 함께할 파트너를 찾고 있습니다. 지금 바로 문의해주세요.
          </p>
        </header>

        <div className="mx-auto mt-10 max-w-2xl">
          <AboutInquiryForm />
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-card bg-white/10 p-7 text-center text-white backdrop-blur-sm ring-1 ring-white/20">
          <h3 className="text-xl font-bold tracking-tight">
            메디맵 소개서 다운 받기
          </h3>
          <a
            href="/medimap-introduction.pdf"
            download="메디맵_소개서.pdf"
            className="mt-4 inline-flex items-center gap-2 rounded-pill bg-white px-6 py-3 text-base font-bold text-brand shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
          >
            <FileDown size={18} />
            소개서 받기 (PDF)
          </a>
          <p className="mt-3 text-[12px] text-white/75">
            메디맵의 자세한 소개가 담긴 PDF 파일을 즉시 다운로드합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
