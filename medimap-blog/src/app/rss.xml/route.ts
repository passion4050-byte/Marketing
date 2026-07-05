/**
 * Round 118-B (2026-07-03) — RSS 2.0 피드 (네이버 서치어드바이저 RSS 제출용).
 *
 * GET /rss.xml
 *   - 자사 블로그(posts.ts) + 파트너 콘텐츠(partners.ts) 통합, 최신 50건.
 *   - 두 헬퍼 모두 status='published' + compliance pass 필터를 이미 내장
 *     (Round 117-B 감사에서 확인) — archived/draft 는 자동 제외.
 *   - sitemap.ts 와 동일하게 graceful degradation (한쪽 실패 시 나머지만 발행).
 *   - revalidate 3600 — sitemap 과 동일 캐시 정책.
 *
 * 네이버 제출: 서치어드바이저 → 요청 → RSS 제출 → https://wecircle.co.kr/rss.xml
 */
import { getAllPostsIncludingLegacy } from "@/lib/posts";
import { getAllPartnerPosts } from "@/lib/partners";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const revalidate = 3600;

interface FeedItem {
  title: string;
  link: string;
  description: string;
  dateIso: string;
  /** Round 129 — content:encoded 용 본문 HTML (네이버 권장: 이미지 포함 전체 본문).
   *  파트너 글만 헬퍼가 body 를 제공 — 크기 제한 고려해 최신 20건만 포함. */
  html?: string;
}

function cdata(s: string): string {
  // CDATA 종료 시퀀스 이스케이프
  return `<![CDATA[${(s || "").replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

async function safePosts(): Promise<FeedItem[]> {
  try {
    const posts = await getAllPostsIncludingLegacy();
    return posts.map((p) => ({
      title: p.title,
      link: absoluteUrl(`/blog/${p.slug}`),
      description: p.description || "",
      dateIso: p.date,
    }));
  } catch (err) {
    console.error("[rss] getAllPostsIncludingLegacy failed, omitting blog items:", err);
    return [];
  }
}

async function safePartnerPosts(): Promise<FeedItem[]> {
  try {
    const posts = await getAllPartnerPosts();
    return posts.map((p) => ({
      title: p.title,
      link: absoluteUrl(
        `/with-partners/${p.partner_category}/${p.partner_slug}/${p.slug}`,
      ),
      description: p.excerpt || "",
      dateIso: p.published_at,
      html: p.body || undefined,
    }));
  } catch (err) {
    console.error("[rss] getAllPartnerPosts failed, omitting partner items:", err);
    return [];
  }
}

export async function GET() {
  const [blogItems, partnerItems] = await Promise.all([
    safePosts(),
    safePartnerPosts(),
  ]);

  const items = [...blogItems, ...partnerItems]
    .filter((it) => it.title && it.link)
    .sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime())
    .slice(0, 50);

  const now = new Date().toUTCString();
  // Round 129 — 네이버 권장: 본문 전체(content:encoded) 제공. 피드 크기 제한을 고려해
  // 최신 20건만 본문 포함 (파트너 글 — body 보유분), 나머지는 요약만.
  const FULL_CONTENT_LIMIT = 20;
  const xmlItems = items
    .map(
      (it, i) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="true">${esc(it.link)}</guid>
      <description>${esc(it.description.slice(0, 300))}</description>${
        it.html && i < FULL_CONTENT_LIMIT
          ? `\n      <content:encoded>${cdata(it.html)}</content:encoded>`
          : ""
      }
      <pubDate>${toRfc822(it.dateIso)}</pubDate>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(`${siteConfig.name} 인사이트`)}</title>
    <link>${esc(siteConfig.url)}</link>
    <description>${esc(siteConfig.description)}</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${esc(absoluteUrl("/rss.xml"))}" rel="self" type="application/rss+xml" />
${xmlItems}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
