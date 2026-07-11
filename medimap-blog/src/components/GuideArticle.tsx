import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
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
 * en/ja/zh 공용 가이드 아티클 렌더 — 커버 이미지 + 본문(prose-medimap) + FAQ + schema(Article/Breadcrumb/FAQPage).
 * langPath = "en"|"ja"|"zh" (URL), inLang = schema inLanguage ("en"|"ja"|"zh-Hans").
 */
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
      { "@type": "ListItem", position: 1, name: labels.guides, item: `${siteConfig.url}/${langPath}` },
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

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      {faqLd && <JsonLd data={faqLd} />}

      <nav className="mb-6 text-[12px] text-stone-400">
        <Link href={`/${langPath}`} className="hover:text-stone-700">
          {labels.guides}
        </Link>{" "}
        / {guide.title}
      </nav>

      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-5xl">
        {guide.title}
      </h1>
      {guide.published_at && (
        <p className="mt-3 text-sm text-stone-500">
          {labels.updated} {new Date(guide.published_at).toISOString().slice(0, 10)}
        </p>
      )}

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
        <ContactButtons waLabel={labels.ctaBtn} className="mt-6 justify-center" />
      </div>
    </article>
  );
}
