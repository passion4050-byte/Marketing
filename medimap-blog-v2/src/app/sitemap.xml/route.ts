/**
 * /sitemap.xml — 발행된 글 전체 + 정적 페이지.
 */
import { NextResponse } from 'next/server';
import { buildSitemapXml } from '@/lib/aeo';
import { siteConfig } from '@/lib/site-config';
import { contentTopics, faqItems, publications } from '@/lib/mock-data';

export const runtime = 'edge';
export const revalidate = 600;

export async function GET() {
  const staticUrls = [
    { loc: `${siteConfig.url}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${siteConfig.url}/blog`, changefreq: 'daily', priority: 0.9 },
    { loc: `${siteConfig.url}/faq`, changefreq: 'weekly', priority: 0.9 },
    { loc: `${siteConfig.url}/ai-code`, changefreq: 'monthly', priority: 0.5 }
  ];

  const faqUrls = faqItems
    .filter((q) => q.status === 'published')
    .map((q) => ({
      loc: `${siteConfig.url}/faq#${q.id}`,
      lastmod: q.updatedAt.slice(0, 10),
      changefreq: 'monthly',
      priority: 0.7
    }));

  const blogUrls = contentTopics
    .flatMap((t) => t.posts)
    .map((p) => ({
      loc: `${siteConfig.url}/blog/${p.id}`,
      changefreq: 'monthly',
      priority: 0.7
    }));

  const pubUrls = publications.map((p) => ({
    loc: p.url,
    lastmod: p.publishedAt.slice(0, 10),
    changefreq: 'monthly',
    priority: 0.8
  }));

  const xml = buildSitemapXml([...staticUrls, ...faqUrls, ...blogUrls, ...pubUrls]);
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
