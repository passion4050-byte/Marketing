/**
 * /sitemap.xml — 이 앱(geo.wecircle.co.kr)에 **실제로 존재하는** 공개 페이지만.
 *
 * 🔴 Round 194 (2026-09-08) — 이 파일은 mock 데이터로 사이트맵을 만들고 있었다.
 *   실측(2026-09-08, https://geo.wecircle.co.kr/sitemap.xml):
 *     - URL 16개 전부가 호스트 `geo-v2-beta.vercel.app` (프리뷰 도메인)
 *     - /blog/post-1-1 같은 **더미 슬러그** (mock-data.ts 의 contentTopics)
 *     - /blog · /faq · /ai-code 는 이 앱에 **라우트 자체가 없다** → 404 를 광고 중
 *   즉 크롤러에게 "다른 도메인의 없는 페이지 16개" 를 알려주고 있었다.
 *   AI 크롤러는 크롤 예산이 유한하므로 이건 순손실이고, 프리뷰 도메인이
 *   중복 색인될 위험까지 있다.
 *
 *   ⚠ 실제 콘텐츠(블로그 글 500여 편)는 이 앱이 아니라 **wecircle.co.kr**(medimap-blog)
 *     에 있고, 그쪽 sitemap.xml 은 정상이다(자기 호스트 · 418개). 여기서 콘텐츠
 *     URL 을 흉내 내면 안 된다.
 *
 *   그래서 이 사이트맵은 이 앱에 page.tsx 가 실재하는 공개 경로만 싣는다.
 *   페이지를 추가하면 여기에 한 줄 추가할 것 — mock 을 다시 끌어오지 말 것.
 */
import { NextResponse } from 'next/server';
import { buildSitemapXml } from '@/lib/aeo';
import { siteConfig } from '@/lib/site-config';

export const runtime = 'edge';
export const revalidate = 600;

export async function GET() {
  // 실재하는 공개 라우트만. (admin/client/report/r/c 는 로그인·리다이렉트 표면이라 제외)
  const urls = [
    { loc: `${siteConfig.url}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${siteConfig.url}/scanner`, changefreq: 'weekly', priority: 0.8 }
  ];

  const xml = buildSitemapXml(urls);
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600'
    }
  });
}
