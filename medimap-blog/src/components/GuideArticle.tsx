import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { siteConfig } from "@/lib/site";
import type { Guide } from "@/lib/guides";

export interface GuideLabels {
  guides: string;
  faq: string;
  updated: string;
  ctaTitle: string;
  ctaBody: string;
  ctaBtn: string;
}

/**
 * Round 145c (2026-08-14) — 환자 전환 구조 (페르소나 E2E 감사 반영).
 *   #10 브레드크럼: B2B 홈 → /{lang}/blog 가이드 허브로.
 *   #18 신뢰 라인: 파트너 의료기관 네트워크·검수 표기.
 *   #7  인라인 환자 CTA: 본문 직후(FAQ 앞) — 스크롤 8~10화면짜리 글에서 CTA 도달 단축.
 *   #16 안심 칩: 무료·언어·응답시간 3요소.
 *   컴포넌트 내부 로컬라이즈(라벨 객체 확장 없이 langPath 로 분기) — 페이지 호출부 무변경.
 */
const PATIENT_COPY: Record<
  string,
  { trust: string; inlineTitle: string; inlineBody: string; wa: string; line: string; chips: string[] }
> = {
  en: {
    trust: "Published by WECIRCLE with its partner medical network. Reviewed under Korean medical advertising rules.",
    inlineTitle: "Questions while reading?",
    inlineBody: "Message us about treatment in Korea. We help you compare clinics and book.",
    wa: "Chat on WhatsApp",
    line: "LINE",
    chips: ["Free", "English OK", "Reply within 1 business day"],
  },
  ja: {
    trust: "本ガイドはWECIRCLEが提携医療機関ネットワークとともに発信し、韓国医療広告ガイドラインに基づき検収しています。",
    inlineTitle: "読みながら気になることは？",
    inlineBody: "韓国での施術について、お気軽にご相談ください。クリニック比較から予約までお手伝いします。",
    wa: "WhatsApp",
    line: "LINEで無料相談",
    chips: ["無料", "日本語OK", "1営業日以内に返信"],
  },
  zh: {
    trust: "本指南由 WECIRCLE 与合作医疗机构网络共同发布，并按韩国医疗广告规范审核。",
    inlineTitle: "阅读中有疑问吗？",
    inlineBody: "欢迎咨询赴韩就医事宜，我们协助您比较诊所并完成预约。",
    wa: "WhatsApp 咨询",
    line: "LINE",
    chips: ["免费", "中文可沟通", "1个工作日内回复"],
  },
};

export function GuideArticle({
  guide,
  langPath,
  inLang,
  labels,
}: {
  guide: Guide;
  langPath: string;
  inLang: string;
  labels: GuideLabels;
}) {
  const base = `${siteConfig.url}/${langPath}/guides/${guide.slug}`;
  const pc = PATIENT_COPY[langPath] ?? PATIENT_COPY.en;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.excerpt ?? undefined,
    inLanguage: inLang,
    image: guide.cover_image_url ? [guide.cover_image_url] : undefined,
    mainEntityOfPage: base,
    datePublished: guide.published_at ?? undefined,
    author: { "@type": "Organization", name: "WECIRCLE" },
    publisher: { "@type": "Organization", name: "WECIRCLE", legalName: "주식회사 위서클" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: labels.guides, item: `${siteConfig.url}/${langPath}/blog` },
      { "@type": "ListItem", position: 2, name: guide.title, item: base },
    ],
  };
  const faqLd =
    guide.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const chips = (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {pc.chips.map((c) => (
        <span
          key={c}
          className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20"
        >
          {c}
        </span>
      ))}
    </div>
  );

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      {faqLd && <JsonLd data={faqLd} />}

      <nav className="mb-6 text-[12px] text-stone-400">
        <Link href={`/${langPath}/blog`} className="hover:text-stone-700">
          {labels.guides}
        </Link>{" "}
        / {guide.title}
      </nav>

      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-5xl">
        {guide.title}
      </h1>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {guide.published_at ? (
          <p className="text-sm text-stone-500">
            {labels.updated} {new Date(guide.published_at).toISOString().slice(0, 10)}
          </p>
        ) : (
          <span />
        )}
        {/* 이 글의 다른 언어 버전으로 바로 이동 — 타이틀 영역 인라인 스위처 */}
        <LanguageSwitcher variant="inline" />
      </div>

      <p className="mt-4 border-l-2 border-[#1B68FF]/40 pl-3 text-[12.5px] leading-relaxed text-stone-500">
        {pc.trust}
      </p>

      {guide.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={guide.cover_image_url}
          alt={guide.cover_image_alt ?? guide.title}
          className="mt-7 aspect-[16/9] w-full rounded-2xl border border-stone-200 object-cover"
          loading="eager"
        />
      )}

      <div
        className="prose-medimap mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: guide.body }}
      />

      {/* 인라인 환자 CTA — 본문을 다 읽기 전에도 상담 진입 가능 (감사 #7) */}
      <div className="mt-10 rounded-2xl bg-stone-50 px-6 py-6 ring-1 ring-stone-200">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-base font-bold text-stone-900">{pc.inlineTitle}</div>
            <p className="mt-1 text-sm text-stone-600">{pc.inlineBody}</p>
          </div>
          <ContactButtons lang={langPath} waLabel={pc.wa} lineLabel={pc.line} className="shrink-0" />
        </div>
      </div>

      {guide.faq.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-stone-950">{labels.faq}</h2>
          <div className="mt-4 space-y-4">
            {guide.faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-bold text-stone-900">{f.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-14 rounded-2xl bg-stone-950 px-6 py-10 text-center text-white">
        <h2 className="text-2xl font-black">{labels.ctaTitle}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-stone-300">{labels.ctaBody}</p>
        <ContactButtons lang={langPath} waLabel={labels.ctaBtn} lineLabel={pc.line} className="mt-6 justify-center" />
        {chips}
      </div>
    </article>
  );
}
