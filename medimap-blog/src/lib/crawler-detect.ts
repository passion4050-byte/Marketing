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
const BOT_PATTERNS: Array<{ name: string; regex: RegExp }> = [
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
