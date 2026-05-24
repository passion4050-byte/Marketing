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
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/client/", "/api/"] },
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
