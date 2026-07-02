import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Megaphone,
  Database,
  ClipboardList,
  TrendingUp,
  Star,
  Quote,
  Sparkles,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { ArticleCard } from "@/components/ArticleCard";
import { AboutInquiryForm } from "@/components/AboutInquiryForm";
import { breadcrumbLd, organizationLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

export const revalidate = false;

// Round 91 (2026-06-28) — wecircle 리브랜딩.
export const metadata: Metadata = {
  title: "회사소개 | WECIRCLE",
  description:
    "WECIRCLE 은 AI 검색 시대의 의료 마케팅 자동화 SaaS 입니다. ChatGPT · Gemini · Claude · Perplexity 가 우리 클라이언트 병원을 추천하도록 GEO/AEO 최적화 콘텐츠를 자동 생성합니다.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "회사소개 | WECIRCLE",
    description:
      "AI 검색 시대, 병원 마케팅을 다시 설계합니다 — WECIRCLE.",
    type: "website",
  },
};

export default async function AboutPage() {
  const posts = await getAllPosts();
  const featured = posts[0];
  const recent = posts.slice(1, 4);

  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "회사소개", href: "/about" },
        ])}
      />

      <Hero />
      <FeatureSpotlight />
      <WhyMedimap />
      <HowToStart />
      <BlogStories featured={featured} recent={recent} />
      <PartnerReviews />
      <InquiryCta />
    </>
  );
}

/* ────────────────── Section 1 — Hero ────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-brand-mesh opacity-80" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-white/0 via-brand-50/30 to-white"
        aria-hidden
      />
      <div className="absolute inset-0 bg-grid-dots opacity-40" aria-hidden />
      <div className="container-content relative grid items-center gap-12 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-24">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-pill border border-brand-100 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700 backdrop-blur">
            <Sparkles size={13} className="text-accent" />
            About WECIRCLE
          </span>
          <h1 className="mt-6 text-[40px] font-extrabold leading-[1.12] tracking-[-0.025em] balance-text md:text-[52px]">
            AI 검색 시대,{" "}
            <span className="bg-gradient-to-br from-brand to-accent bg-clip-text text-transparent">
              병원 마케팅
            </span>
            을
            <br className="hidden md:block" />
            <span className="md:inline"> </span>다시 설계합니다
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-[1.7] text-ink-muted pretty-text">
            WECIRCLE 은 의료기관을 위한 AI 검색 최적화 SaaS 입니다. ChatGPT ·
            Gemini · Claude · Perplexity 가 우리 클라이언트 병원을 추천하도록,
            GEO/AEO 최적화된 콘텐츠를 자동 생성하고 실측 데이터로 검증합니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={siteConfig.contact.kakao}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              상담 신청하기
              <ArrowRight size={18} />
            </Link>
            <Link href="#inquiry" className="btn-secondary">
              파트너 문의
            </Link>
          </div>
        </div>
        <PhoneMockup />
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm animate-fade-in-up [animation-delay:120ms]">
      <div className="absolute -inset-6 rotate-3 rounded-[40px] bg-gradient-to-br from-brand-100/80 via-accent-50 to-brand-50 blur-2xl" />
      <div
        className="relative h-full w-full overflow-hidden rounded-[36px] border border-line/70 bg-white shadow-card"
        aria-hidden
      >
        <div className="absolute left-1/2 top-3 h-1.5 w-20 -translate-x-1/2 rounded-full bg-ink/10" />
        <div className="flex h-full flex-col gap-4 p-5 pt-12">
          <div className="rounded-card bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100/60">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-700">
                확정된 플랫폼 사용자
              </div>
              <span className="rounded-pill bg-brand text-white px-2 py-0.5 text-[10px] font-bold">
                AI 픽
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="text-[20px] font-extrabold text-brand num">
                82만+
              </div>
              <div className="text-[11px] text-ink-muted">
                도시 지표 · 실시간
              </div>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-brand/10">
              <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-brand to-accent" />
            </div>
          </div>

          <div className="rounded-card bg-surface-alt p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              80개 도시 매칭
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["라식", "스마일", "백내장", "노안", "보톡스", "치과"].map(
                (label, i) => (
                  <div
                    key={label}
                    className={`rounded-pill border px-2 py-1 text-center text-[10px] font-semibold ${
                      i === 1
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-line bg-white text-ink-muted"
                    }`}
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-card border border-line/70 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                높은 진단 가능성
              </div>
              <div className="text-[10px] font-bold text-accent num">
                ↑ 24%
              </div>
            </div>
            <div className="mt-3 flex items-end gap-1.5">
              {[28, 38, 30, 46, 42, 58, 50].map((h, i) => (
                <div
                  key={i}
                  style={{ height: h }}
                  className={`w-4 rounded-t ${
                    i >= 5
                      ? "bg-gradient-to-t from-brand to-accent"
                      : "bg-brand/15"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Section 2 — WECIRCLE 만의 특별함 ────────────────── */

function FeatureSpotlight() {
  return (
    <section className="container-content py-20">
      <header className="mx-auto max-w-2xl text-center">
        <span className="pill-label">핵심 가치</span>
        <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
          WECIRCLE 만의 특별함
        </h2>
        <p className="mt-3 text-ink-muted pretty-text">
          WECIRCLE 은 단순한 &lsquo;블로그 자동 작성기&rsquo;가 아닙니다. ChatGPT · Gemini · Claude
          병·의원 정보를 원하는 방식으로 탐색하고, 올바른 선택을 돕는 가이드
          역할을 합니다.
        </p>
      </header>

      <div className="mt-12 grid items-center gap-12 md:grid-cols-[0.85fr_1.15fr]">
        <div className="mx-auto w-full max-w-[260px]">
          <SmallPhoneMockup />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
            Main Tap
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight">
            다양한 콘텐츠로 병원/의사 정보를 한눈에
          </h3>
          <ul className="mt-5 space-y-3">
            {[
              "AI 기반 검색으로 빠르게 진료 가능 범위 안내",
              "신뢰 기반 정보로 후기와 시술 비교를 한 화면에서",
              "병원 위치 · 진료 시간 · 진료비를 단일 카드로 통합",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-muted"
              >
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-brand to-accent" />
                {line}
              </li>
            ))}
          </ul>
          <Link
            href="/blog"
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

function SmallPhoneMockup() {
  return (
    <div className="relative aspect-[3/4.4] w-full">
      <div className="absolute -inset-4 -rotate-3 rounded-[32px] bg-gradient-to-br from-accent-50 to-brand-50 blur-xl" />
      <div
        className="relative h-full w-full overflow-hidden rounded-[28px] border border-line/70 bg-white shadow-card"
        aria-hidden
      >
        <div className="absolute left-1/2 top-2.5 h-1 w-14 -translate-x-1/2 rounded-full bg-ink/10" />
        <div className="flex h-full flex-col gap-2.5 p-4 pt-9">
          <div className="rounded-card bg-surface-alt px-3 py-2 text-[10px] font-semibold text-ink-subtle">
            🔍 강남 라식 잘하는 곳
          </div>
          {[
            { name: "WECIRCLE 추천", tag: "AI 픽", on: true },
            { name: "근거리 병원", tag: "1.2km", on: false },
            { name: "이벤트 진행 중", tag: "3건", on: false },
          ].map((row) => (
            <div
              key={row.name}
              className={`flex items-center justify-between rounded-card border p-3 ${
                row.on
                  ? "border-brand-200 bg-brand-50"
                  : "border-line/70 bg-white"
              }`}
            >
              <div className="flex flex-col">
                <div
                  className={`text-[11px] font-bold ${
                    row.on ? "text-brand-700" : "text-ink"
                  }`}
                >
                  {row.name}
                </div>
                <div className="mt-1 h-1.5 w-16 rounded-full bg-ink/10" />
              </div>
              <span
                className={`rounded-pill px-2 py-0.5 text-[9px] font-bold ${
                  row.on
                    ? "bg-brand text-white"
                    : "bg-surface-alt text-ink-muted"
                }`}
              >
                {row.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Section 3 — 왜 위서클일까? ────────────────── */

function WhyMedimap() {
  const items = [
    {
      icon: <ShieldCheck size={26} />,
      title: "신뢰할 수 있는 데이터 기반",
      desc: "의료법에 입증된 데이터만 사용 — 과장 없는 분석 환경을 제공합니다.",
    },
    {
      icon: <Megaphone size={26} />,
      title: "보안된 광고 운영",
      desc: "병원 가격 정보의 자유로운 공개를 막지 않으면서, 환자에겐 정직하게 노출.",
    },
    {
      icon: <Database size={26} />,
      title: "대형 병원 DB",
      desc: "B2C와 B2B 서비스를 동시 제공하며 안정적인 신규 고객 확보까지 연결합니다.",
    },
  ];
  return (
    <section className="bg-surface-alt/60 py-20">
      <div className="container-content">
        <header className="mx-auto max-w-2xl text-center">
          <span className="pill-label">차별점</span>
          <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
            왜 <span className="text-brand">WECIRCLE</span> 일까?
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

/* ────────────────── Section 4 — 어떻게 시작하나요 ────────────────── */

function HowToStart() {
  return (
    <section className="container-content py-20">
      <header className="mx-auto max-w-2xl text-center">
        <span className="pill-label">병원 입점 가이드</span>
        <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
          어떻게 시작하나요?
        </h2>
        <p className="mt-3 text-ink-muted pretty-text">
          간단하고 빠르게 입점 절차가 가능합니다.
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-card border border-line/70 bg-white p-7 shadow-soft">
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
            병원 정보를 등록하고 WECIRCLE 입점 가이드의 권장 순서를 따라 가시면
            됩니다.
          </p>
        </div>

        <div className="rounded-card border border-line/70 bg-white p-7 shadow-soft">
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
          <DashboardPreviewMock />
          <p className="mt-5 text-[14px] leading-relaxed text-ink-muted">
            실시간 데이터로 고객 관리부터 성장 전략까지 확인하세요.
          </p>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link href="#inquiry" className="btn-primary">
          입점 문의하기
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function FormPreviewMock() {
  return (
    <div className="mt-5 rounded-card border border-line/60 bg-surface-alt/60 p-4">
      <div className="space-y-2">
        <div className="rounded-md bg-white px-3 py-2 text-[11px] text-ink-subtle">
          병원명을 입력해주세요
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-[11px] text-ink-subtle">
          진료과 선택
        </div>
        <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[11px] text-ink">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand" />
          <span className="font-semibold">개인정보 수집 동의</span>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1 rounded-pill bg-brand px-3 py-1.5 text-[11px] font-bold text-white">
        등록 문의하기 <ArrowRight size={11} />
      </div>
    </div>
  );
}

function DashboardPreviewMock() {
  return (
    <div className="mt-5 rounded-card border border-line/60 bg-surface-alt/60 p-4">
      <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
        <span className="text-[11px] font-semibold text-ink">신규 환자 유입</span>
        <span className="text-[11px] font-bold text-brand num">+250</span>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-md bg-white px-3 py-2">
        <span className="text-[11px] font-semibold text-ink">상담 전환율</span>
        <span className="text-[11px] font-bold text-accent num">+18.4%</span>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-md bg-white px-3 py-2">
        <span className="text-[11px] font-semibold text-ink">월 매출 성장</span>
        <span className="text-[11px] font-bold text-brand num">↑ 32%</span>
      </div>
    </div>
  );
}

/* ────────────────── Section 5 — 위서클 이야기(블로그) ────────────────── */

function BlogStories({
  featured,
  recent,
}: {
  featured: ReturnType<typeof getAllPosts> extends Promise<infer T>
    ? T extends Array<infer U>
      ? U | undefined
      : never
    : never;
  recent: ReturnType<typeof getAllPosts> extends Promise<infer T>
    ? T extends Array<infer U>
      ? U[]
      : never
    : never;
}) {
  return (
    <section className="bg-surface-alt/60 py-20">
      <div className="container-content">
        <header className="mx-auto max-w-2xl text-center">
          <span className="pill-label">위서클 인사이트</span>
          <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
            WECIRCLE 전문가의 인사이트
          </h2>
          <p className="mt-3 text-ink-muted pretty-text">
            WECIRCLE 전문가들이 작성한 AI 검색 시대 의료 마케팅 인사이트를 만나보세요.
          </p>
        </header>

        {featured && (
          <div className="mt-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-pill bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700">
              <Star size={11} className="fill-current" />
              베스트 게시물
            </div>
            <Link
              href={`/blog/${featured.slug}`}
              className="group block overflow-hidden rounded-card border border-line/70 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
                <div className="relative aspect-[16/9] bg-gradient-to-br from-brand-100 via-accent-50 to-brand-50 md:aspect-auto">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-[44px] font-extrabold tracking-tight text-white/90 drop-shadow-[0_4px_24px_rgba(27,104,255,0.45)]">
                      WECIRCLE
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-grid-dots opacity-40" />
                </div>
                <div className="flex flex-col justify-center p-7 md:p-9">
                  {featured.category && (
                    <span className="pill-label self-start">
                      {featured.category}
                    </span>
                  )}
                  <h3 className="mt-3 text-2xl font-bold leading-snug tracking-tight transition-colors group-hover:text-brand">
                    {featured.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-ink-muted">
                    {featured.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    자세히 보기
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {recent.length > 0 && (
          <>
            <div className="mt-14 mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              최근 게시물
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {recent.map((p) => (
                <ArticleCard key={p.slug} post={p} variant="compact" />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/blog" className="btn-secondary">
                더 보기
                <ArrowRight size={16} />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ────────────────── Section 6 — 파트너 후기 ────────────────── */

function PartnerReviews() {
  const reviews = [
    {
      stars: 5,
      quote:
        "WECIRCLE 를 통해 AI 검색에 우리 병원이 자연스럽게 노출되기 시작했습니다. 콘텐츠 자동 생성 + 인용 측정 대시보드가 직관적이라 운영 부담 0.",
      name: "강남 OOO 성형외과",
      role: "원장",
    },
    {
      stars: 5,
      quote:
        "광고비를 늘리지 않고도 신규 상담 문의가 안정적으로 늘었습니다. 데이터를 기반으로 한 추천이 큰 차이를 만들었어요.",
      name: "서울 OOO 피부과",
      role: "마케팅 담당",
    },
    {
      stars: 5,
      quote:
        "병원 입점 후 3개월 만에 검색 노출이 눈에 띄게 늘었고, 단골 환자도 늘었습니다. 진심으로 추천합니다.",
      name: "분당 OOO 치과",
      role: "원장",
    },
  ];

  return (
    <section className="container-content py-20">
      <header className="mx-auto max-w-2xl text-center">
        <span className="pill-label">파트너 후기</span>
        <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[34px]">
          실제 파트너의 생생한 후기
        </h2>
        <p className="mt-3 text-ink-muted pretty-text">
          WECIRCLE 과 함께 AI 검색 시대를 준비하는 파트너 병원들의 이야기를 들어보세요.
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
    </section>
  );
}

/* ────────────────── Section 7 — 문의 CTA ────────────────── */

function InquiryCta() {
  return (
    <section
      id="inquiry"
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
      <div className="container-content relative grid gap-12 md:grid-cols-[1fr_1.05fr] md:items-center">
        <div className="text-white">
          <span className="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
            함께하세요
          </span>
          <h2 className="mt-5 text-[32px] font-extrabold leading-[1.18] tracking-[-0.02em] balance-text md:text-[42px]">
            디지털 헬스케어의 미래를
            <br />
            함께 만들어가세요
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/85">
            WECIRCLE 파트너가 되어주시는 모든 의료기관에 최선의 지원을
            약속드립니다.
          </p>
          <div className="mt-8 grid max-w-md gap-3 text-sm">
            <Bullet>비용 부담 없는 입점 컨설팅</Bullet>
            <Bullet>의료법 가이드 + 콘텐츠 자동 검수</Bullet>
            <Bullet>실시간 운영 리포트와 1:1 매니저</Bullet>
          </div>
        </div>
        <AboutInquiryForm />
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-white/95">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
        ✓
      </span>
      {children}
    </div>
  );
}
