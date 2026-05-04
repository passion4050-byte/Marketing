import { siteConfig, absoluteUrl } from "@/lib/site";
import type { PostMeta } from "@/lib/posts";

type JsonLd = Record<string, unknown>;

export function organizationLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.publisher.name,
    legalName: siteConfig.publisher.legalName,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.publisher.logo),
    sameAs: [siteConfig.contact.kakao, siteConfig.contact.naverPlace].filter(Boolean),
  };
}

export function websiteLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: "ko-KR",
    publisher: { "@type": "Organization", name: siteConfig.publisher.name },
  };
}

export function breadcrumbLd(items: { name: string; href: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.href),
    })),
  };
}

export function articleLd(post: PostMeta): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: "ko-KR",
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${post.slug}`) },
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@type": "Organization", name: siteConfig.publisher.name },
    publisher: {
      "@type": "Organization",
      name: siteConfig.publisher.name,
      logo: { "@type": "ImageObject", url: absoluteUrl(siteConfig.publisher.logo) },
    },
    image: post.cover ? [absoluteUrl(post.cover)] : undefined,
    articleSection: post.category,
    keywords: post.tags?.join(", "),
  };
}

export function medicalWebPageLd(post: PostMeta): JsonLd | null {
  if (!post.medicalCondition && !post.medicalSpecialty) return null;
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: post.title,
    description: post.description,
    inLanguage: "ko-KR",
    url: absoluteUrl(`/blog/${post.slug}`),
    about: post.medicalCondition
      ? { "@type": "MedicalCondition", name: post.medicalCondition }
      : undefined,
    specialty: post.medicalSpecialty,
    reviewedBy: post.reviewedBy
      ? { "@type": "Person", name: post.reviewedBy }
      : undefined,
    lastReviewed: post.updated ?? post.date,
    publisher: { "@type": "Organization", name: siteConfig.publisher.name },
  };
}

export function faqPageLd(faq: { question: string; answer: string }[]): JsonLd | null {
  if (!faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function jsonLdScript(data: JsonLd | null | undefined): string {
  if (!data) return "";
  // Strip undefined recursively for clean JSON output
  const clean = JSON.parse(JSON.stringify(data));
  return JSON.stringify(clean);
}
