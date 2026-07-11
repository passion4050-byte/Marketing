import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { siteConfig } from "@/lib/site";
import { getGuide } from "@/lib/guides";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide("en", slug);
  if (!guide) return { title: "Guide — WECIRCLE Global" };
  return {
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: { canonical: `/en/guides/${slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.excerpt ?? undefined },
  };
}

const KAKAO = siteConfig.contact.kakao;

export default async function EnGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("en", slug);
  if (!guide) notFound();

  const base = `${siteConfig.url}/en/guides/${slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.excerpt ?? undefined,
    inLanguage: "en",
    mainEntityOfPage: base,
    datePublished: guide.published_at ?? undefined,
    author: { "@type": "Organization", name: "WECIRCLE" },
    publisher: { "@type": "Organization", name: "WECIRCLE", legalName: "주식회사 위서클" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Guides", item: `${siteConfig.url}/en` },
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
        <Link href="/en" className="hover:text-stone-700">
          Guides
        </Link>{" "}
        / {guide.title}
      </nav>

      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-5xl">
        {guide.title}
      </h1>
      {guide.published_at && (
        <p className="mt-3 text-sm text-stone-500">
          Updated {new Date(guide.published_at).toISOString().slice(0, 10)}
        </p>
      )}

      <div
        className="prose-medimap mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: guide.body }}
      />

      {guide.faq.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-stone-950">Frequently asked questions</h2>
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
        <h2 className="text-2xl font-black">Want your clinic featured &amp; cited by AI?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-stone-300">
          This is the kind of guide WECIRCLE publishes so ChatGPT, Perplexity and Gemini recommend
          partner clinics to foreign patients.
        </p>
        <a
          href={KAKAO}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-full bg-[#1B68FF] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1550cc]"
        >
          Talk to WECIRCLE →
        </a>
      </div>
    </article>
  );
}
