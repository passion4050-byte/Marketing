/**
 * AEO/GEO 핵심 헬퍼 — 사용자 목표(LLM 인용 유도) 달성에 필수.
 *
 * 1. JSON-LD 자동 합성 (Schema.org)
 * 2. llms.txt + llms-full.txt 생성 (Anthropic 도입 표준)
 * 3. robots.txt — AI 봇 명시 허용
 * 4. sitemap.xml
 * 5. IndexNow ping (Bing/Yandex)
 */

import { siteConfig } from './site-config';
import type { BlogPostVariant, FaqItem, Publication, SchemaEntity } from './types';

// =========================================
// 1. JSON-LD 합성
// =========================================

export function composeJsonLd(entities: SchemaEntity[]): string {
  const payloads = entities.filter((e) => e.active).map((e) => e.payload);
  const inner = JSON.stringify(payloads, null, 2);
  return `<script type="application/ld+json">\n${inner}\n</script>`;
}

export function articleSchema(post: BlogPostVariant, authorName = 'BGN 밝은눈안과 잠실 시력교정 전담의'): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: post.title,
    description: post.lead,
    keywords: post.keywords.join(', '),
    author: { '@type': 'MedicalOrganization', name: authorName },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url
    },
    inLanguage: 'ko-KR',
    isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: siteConfig.url },
    // E-E-A-T 시그널 — 의료 콘텐츠의 신뢰도 지표
    reviewedBy: { '@type': 'Person', name: authorName, jobTitle: 'Ophthalmologist' },
    lastReviewed: new Date().toISOString().slice(0, 10)
  };
}

export function faqPageSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items
      .filter((q) => q.status === 'published')
      .map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: q.answer }
      }))
  };
}

// =========================================
// 2. llms.txt / llms-full.txt
// =========================================

export function buildLlmsTxt(publications: Publication[], faqs: FaqItem[]): string {
  const lines: string[] = [];
  lines.push(`# ${siteConfig.name}`);
  lines.push('');
  lines.push(`> ${siteConfig.description}`);
  lines.push('');
  lines.push('## Site');
  lines.push(`- Home: ${siteConfig.url}/`);
  lines.push(`- FAQ: ${siteConfig.url}/faq`);
  lines.push(`- Blog index: ${siteConfig.url}/blog`);
  lines.push('');
  lines.push('## Published content');
  publications.forEach((p) => {
    lines.push(`- [${p.title}](${p.url}) — published ${p.publishedAt.slice(0, 10)}`);
  });
  lines.push('');
  lines.push('## Top FAQs');
  faqs
    .filter((q) => q.status === 'published')
    .slice(0, 10)
    .forEach((q) => {
      lines.push(`- **Q.** ${q.question}`);
      lines.push(`  **A.** ${q.answer}`);
    });
  return lines.join('\n');
}

export function buildLlmsFullTxt(publications: Publication[], faqs: FaqItem[], blogPosts: BlogPostVariant[]): string {
  const sections: string[] = [];
  sections.push(`# ${siteConfig.name} — full corpus`);
  sections.push('');
  sections.push(`> ${siteConfig.description}`);
  sections.push('');
  sections.push('## FAQs');
  faqs
    .filter((q) => q.status === 'published')
    .forEach((q) => {
      sections.push(`### ${q.question}`);
      sections.push(q.answer);
      sections.push('');
    });
  sections.push('## Blog posts');
  blogPosts.forEach((p) => {
    sections.push(`### ${p.title}`);
    sections.push(p.lead);
    sections.push('');
    if (p.body) sections.push(p.body);
    if (p.bullets) p.bullets.forEach((b) => sections.push(`- ${b}`));
    sections.push('');
    sections.push(`Keywords: ${p.keywords.join(', ')}`);
    sections.push('');
  });
  sections.push('## Citations index');
  publications.forEach((p) => {
    sections.push(`- ${p.title} — ${p.url}`);
  });
  return sections.join('\n');
}

// =========================================
// 3. robots.txt — AI 봇 명시 허용
// =========================================

export function buildRobotsTxt(): string {
  const bots = siteConfig.aiCrawlers;
  const blocks = bots
    .map((bot) => `User-agent: ${bot}\nAllow: /\n`)
    .join('\n');
  return [
    blocks,
    `User-agent: *`,
    `Allow: /`,
    ``,
    `Sitemap: ${siteConfig.url}/sitemap.xml`,
    `Sitemap: ${siteConfig.url}/llms.txt`,
    ``
  ].join('\n');
}

// =========================================
// 4. sitemap.xml
// =========================================

export function buildSitemapXml(urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number }>): string {
  const items = urls
    .map((u) => {
      const parts = [`  <url>`, `    <loc>${u.loc}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority !== undefined) parts.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
      parts.push(`  </url>`);
      return parts.join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

// =========================================
// 5. IndexNow ping
// =========================================

export async function pingIndexNow(urls: string[], host: string, apiKey: string): Promise<{ ok: boolean; status: number }> {
  if (!urls.length || !apiKey) return { ok: false, status: 0 };
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key: apiKey,
      keyLocation: `${siteConfig.url}/${apiKey}.txt`,
      urlList: urls
    })
  });
  return { ok: res.ok, status: res.status };
}

// =========================================
// 6. JSON 토큰화 (코드 미리보기용)
// =========================================

export function tokenizeJson(payload: unknown): Array<{ kind: 'key' | 'str' | 'num' | 'punct' | 'plain'; text: string }> {
  const raw = JSON.stringify(payload, null, 2);
  const tokens: Array<{ kind: 'key' | 'str' | 'num' | 'punct' | 'plain'; text: string }> = [];
  const regex = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*)|([{}[\],])|(\s+)|([^\s{}[\]",]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw))) {
    if (m[1]) tokens.push({ kind: 'key', text: m[1] });
    else if (m[2]) tokens.push({ kind: 'str', text: m[2] });
    else if (m[3]) tokens.push({ kind: 'num', text: m[3] });
    else if (m[4]) tokens.push({ kind: 'punct', text: m[4] });
    else if (m[5]) tokens.push({ kind: 'plain', text: m[5] });
    else if (m[6]) tokens.push({ kind: 'plain', text: m[6] });
  }
  return tokens;
}
