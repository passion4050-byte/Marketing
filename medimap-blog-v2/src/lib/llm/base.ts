/**
 * LLM 추상 인터페이스 — provider 4종(ChatGPT/Claude/Gemini/Perplexity) 공통.
 *
 * 운영 원칙:
 *   1. 모든 호출은 비용 가드레일 통과 후에만
 *   2. 타임아웃 강제 (default 60s)
 *   3. 재시도는 429/5xx만, 지수 백오프
 *   4. 응답 + 토큰 사용량 + 비용을 llm_call_logs에 적재
 */

import type { LlmEngine } from '../types';

export interface LlmGenerateInput {
  systemPrompt?: string;
  userPrompt: string;
  /** 키워드/제약 — 의료법 린터 위반 사전 차단용 */
  bannedTokens?: string[];
  temperature?: number;
  maxTokens?: number;
  /** 출력 강제 형식 */
  responseFormat?: 'text' | 'json';
  /** 인용 추적 — Perplexity에서 의미 있음 */
  includeCitations?: boolean;
}

export interface LlmGenerateOutput {
  engine: LlmEngine;
  model: string;
  text: string;
  citations?: Array<{ title: string; url: string }>;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  durationMs: number;
}

export interface LlmProvider {
  readonly engine: LlmEngine;
  readonly defaultModel: string;
  generate(input: LlmGenerateInput): Promise<LlmGenerateOutput>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly engine: LlmEngine,
    public readonly kind: 'auth' | 'rate_limit' | 'timeout' | 'server' | 'compliance' | 'unknown',
    public readonly status?: number
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

// 토큰당 USD 단가 (2026-05 기준, 변동 시 업데이트)
export const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5e-6, output: 10e-6 },
  'gpt-4o-mini': { input: 0.15e-6, output: 0.6e-6 },
  // Anthropic
  'claude-sonnet-4-6': { input: 3e-6, output: 15e-6 },
  'claude-haiku-4-5-20251001': { input: 1e-6, output: 5e-6 },
  // Google
  'gemini-1.5-pro': { input: 1.25e-6, output: 5e-6 },
  'gemini-1.5-flash': { input: 0.075e-6, output: 0.3e-6 },
  // Perplexity
  'sonar-pro': { input: 3e-6, output: 15e-6 },
  'sonar': { input: 1e-6, output: 1e-6 }
};

export function calcCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return p.input * promptTokens + p.output * completionTokens;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, engine: LlmEngine): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new LlmError(`Timeout ${ms}ms`, engine, 'timeout')), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}
