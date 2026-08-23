/**
 * Round 110-B (2026-07-02) — AI 크롤러 UA 감지 유틸.
 *
 * 대상 봇:
 *   - GPTBot         (OpenAI 학습용)
 *   - OAI-SearchBot  (ChatGPT Search 실시간 인용)
 *   - ChatGPT-User   (ChatGPT 세션 내 browse)
 *   - ClaudeBot      (Anthropic 학습용)
 *   - Claude-Web     (Claude 브라우징)
 *   - PerplexityBot  (Perplexity 실시간 인용)
 *   - Perplexity-User
 *   - Google-Extended(Gemini 학습용)
 *   - GoogleOther    (Gemini 실시간)
 *   - CCBot          (Common Crawl → 많은 LLM 학습 소스)
 *   - Bytespider     (TikTok/Bytedance)
 *   - Meta-ExternalAgent (Meta AI)
 *   - Amazonbot      (Alexa/AWS)
 */
// Round 173 (2026-08-23) - 🔴 Googlebot was never in this list.
//   crawler_hits over 14 days: meta-externalagent 1,180 / claudebot 35 /
//   googleother 15 / oai-searchbot 5 / **googlebot 0** - not because Google was not
//   crawling, but because nothing here matched its UA. That left the crawl-budget
//   work (277 duplicate URLs removed, sitemap ~530 -> ~250) with no instrument at
//   all: the only other signal is GSC, which lags by days and reports coverage, not
//   fetch volume. Search crawlers added below so crawl rate is directly observable.
const BOT_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // --- search crawlers (Round 173) ---
  //   Order matters: the first match wins, and Google's non-search agents carry
  //   their own tokens (GoogleOther, Google-Extended, Google-InspectionTool), so
  //   they must be tested before the generic /Googlebot/ pattern.
  { name: 'google-inspectiontool', regex: /Google-InspectionTool/i },
  { name: 'googlebot-image', regex: /Googlebot-Image/i },
  { name: 'googlebot', regex: /Googlebot/i },
  { name: 'bingbot', regex: /bingbot/i },
  // Naver's crawler UA is "Yeti/1.1 (NHN Corp.; http://help.naver.com/robots/)".
  //   Require the version token: a bare /Yeti/ would also match unrelated UA strings.
  { name: 'naver-yeti', regex: /Yeti\/[\d.]+/i },
  // Daum is deliberately NOT matched. Its crawler token is "Daum/4.1", but the Daum
  //   and KakaoTalk in-app browsers - real people, in Korea, the primary audience -
  //   also carry "Daum" in their UA. detectAiCrawler() feeds /r/{slug}'s bot filter,
  //   so a false positive there would silently drop human clicks from
  //   shortlink_clicks. Not worth the crawl-rate datapoint.
  // --- AI crawlers ---
  { name: 'gptbot', regex: /GPTBot/i },
  { name: 'oai-searchbot', regex: /OAI-SearchBot/i },
  { name: 'chatgpt-user', regex: /ChatGPT-User/i },
  { name: 'claudebot', regex: /ClaudeBot/i },
  { name: 'claude-web', regex: /Claude-Web/i },
  { name: 'perplexitybot', regex: /PerplexityBot/i },
  { name: 'perplexity-user', regex: /Perplexity-User/i },
  { name: 'google-extended', regex: /Google-Extended/i },
  { name: 'googleother', regex: /GoogleOther/i },
  { name: 'ccbot', regex: /CCBot/i },
  { name: 'bytespider', regex: /Bytespider/i },
  { name: 'meta-externalagent', regex: /meta-externalagent/i },
  { name: 'amazonbot', regex: /Amazonbot/i },
  { name: 'applebot-extended', regex: /Applebot-Extended/i },
  { name: 'diffbot', regex: /Diffbot/i },
];

export function detectAiCrawler(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  for (const { name, regex } of BOT_PATTERNS) {
    if (regex.test(userAgent)) return name;
  }
  return null;
}

export const AI_CRAWLER_NAMES = BOT_PATTERNS.map((b) => b.name);
