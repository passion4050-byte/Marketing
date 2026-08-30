import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * AI 검색 / GEO 크롤러 풀 허용. 2026-05-24 갱신.
 * - OpenAI: GPTBot (학습) + ChatGPT-User (실시간 fetch) + OAI-SearchBot (SearchGPT)
 * - Anthropic: ClaudeBot + Claude-Web + anthropic-ai
 * - Google: Google-Extended (Gemini 학습) + Googlebot (검색)
 * - Perplexity: PerplexityBot (학습) + Perplexity-User (실시간)
 * - Bing: Bingbot (Copilot 의존)
 * - Common Crawl: CCBot (대부분 LLM 학습 corpus 소스)
 *
 * 🔴 Round 181 (2026-08-30) — 네이버 Yeti 를 명시 추가.
 *   `User-agent: *` 로 이미 허용되긴 하지만, 네이버 웹마스터 가이드가
 *   `User-agent: Yeti / Allow: /` 를 **명시**하도록 안내한다.
 *   실측 근거: 크롤러 트래픽의 55%가 naver-yeti 이고, 같은 30일 창에서
 *   네이버 노출 1,800 / 클릭 30 vs 구글 644 / 클릭 17 — 네이버가 이미 최대 채널이다.
 *
 *   ⚠ 참고(전략): blog.naver.com/robots.txt 는 GPTBot·OAI-SearchBot·PerplexityBot·
 *   Google-Extended·ClaudeBot·CCBot 을 **전부 Disallow** 한다
 *   ("BOT ACCESS FOR AI TRAINING AND RAG IS STRICTLY PROHIBITED").
 *   즉 네이버 블로그에 쓴 글은 어떤 외부 AI 에도 인용될 수 없다.
 *   AI 인용을 받을 수 있는 자산은 이 사이트(wecircle.co.kr)뿐이다 —
 *   이 robots.txt 가 우리 GEO 상품의 물리적 근거다. 절대 좁히지 말 것.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/client/", "/api/"] },
      // 네이버 (Round 181 — 크롤러 트래픽 55%, 최대 유입 채널)
      { userAgent: "Yeti", allow: "/" },
      // OpenAI 계열
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      // Anthropic
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      // Google
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
      // Perplexity
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      // Bing (Copilot)
      { userAgent: "Bingbot", allow: "/" },
      // Common Crawl
      { userAgent: "CCBot", allow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
