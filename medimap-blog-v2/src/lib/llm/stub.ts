import type { LlmGenerateInput, LlmGenerateOutput, LlmProvider } from './base';
import type { LlmEngine } from '../types';

/**
 * Stub provider — env 미설정 시 사용. 결정적 응답 + 0 cost.
 * UI/파이프라인 검증을 실 SDK 키 없이 진행하기 위함.
 */
export class StubProvider implements LlmProvider {
  readonly engine: LlmEngine;
  readonly defaultModel = 'stub-v1';

  constructor(engine: LlmEngine = 'chatgpt') {
    this.engine = engine;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const startedAt = Date.now();
    await new Promise((r) => setTimeout(r, 50));
    const sample = `[stub:${this.engine}] ${input.userPrompt.slice(0, 80)}…`;
    return {
      engine: this.engine,
      model: this.defaultModel,
      text: sample,
      promptTokens: Math.ceil(input.userPrompt.length / 4),
      completionTokens: Math.ceil(sample.length / 4),
      costUsd: 0,
      durationMs: Date.now() - startedAt
    };
  }
}
