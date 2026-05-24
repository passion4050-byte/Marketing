import { LlmError, calcCost, withTimeout } from './base';
import type { LlmGenerateInput, LlmGenerateOutput, LlmProvider } from './base';

/**
 * Perplexity — OpenAI 호환 REST 인터페이스 + citations 반환.
 * AEO 측정 측면에서 가장 중요한 엔진(실시간 웹 인용).
 */
export class PerplexityProvider implements LlmProvider {
  readonly engine = 'perplexity' as const;
  readonly defaultModel: string;

  constructor(private readonly apiKey: string, model = 'sonar') {
    if (!apiKey) throw new LlmError('PERPLEXITY_API_KEY missing', 'perplexity', 'auth');
    this.defaultModel = model;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const startedAt = Date.now();
    const body = {
      model: this.defaultModel,
      messages: [
        ...(input.systemPrompt ? [{ role: 'system', content: input.systemPrompt }] : []),
        { role: 'user', content: input.userPrompt }
      ],
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 1500,
      return_citations: input.includeCitations ?? true
    };

    const res = await withTimeout(
      fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }),
      60_000,
      'perplexity'
    );

    if (!res.ok) {
      const kind = res.status === 401 ? 'auth' : res.status === 429 ? 'rate_limit' : 'server';
      throw new LlmError(`Perplexity ${res.status}`, 'perplexity', kind, res.status);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
      citations?: string[];
    };

    const text = json.choices[0]?.message?.content ?? '';
    const promptTokens = json.usage.prompt_tokens;
    const completionTokens = json.usage.completion_tokens;
    return {
      engine: 'perplexity',
      model: this.defaultModel,
      text,
      citations: json.citations?.map((url) => ({ title: url, url })) ?? [],
      promptTokens,
      completionTokens,
      costUsd: calcCost(this.defaultModel, promptTokens, completionTokens),
      durationMs: Date.now() - startedAt
    };
  }
}
