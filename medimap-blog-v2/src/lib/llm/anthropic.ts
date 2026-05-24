import { LlmError, calcCost, withTimeout } from './base';
import type { LlmGenerateInput, LlmGenerateOutput, LlmProvider } from './base';

export class AnthropicProvider implements LlmProvider {
  readonly engine = 'claude' as const;
  readonly defaultModel: string;

  constructor(private readonly apiKey: string, model = 'claude-haiku-4-5-20251001') {
    if (!apiKey) throw new LlmError('ANTHROPIC_API_KEY missing', 'claude', 'auth');
    this.defaultModel = model;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const startedAt = Date.now();
    const body = {
      model: this.defaultModel,
      max_tokens: input.maxTokens ?? 1500,
      temperature: input.temperature ?? 0.4,
      ...(input.systemPrompt ? { system: input.systemPrompt } : {}),
      messages: [{ role: 'user', content: input.userPrompt }]
    };

    const res = await withTimeout(
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }),
      60_000,
      'claude'
    );

    if (!res.ok) {
      const kind = res.status === 401 ? 'auth' : res.status === 429 ? 'rate_limit' : 'server';
      throw new LlmError(`Anthropic ${res.status}`, 'claude', kind, res.status);
    }

    const json = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = json.content.find((c) => c.type === 'text')?.text ?? '';
    const promptTokens = json.usage.input_tokens;
    const completionTokens = json.usage.output_tokens;
    return {
      engine: 'claude',
      model: this.defaultModel,
      text,
      promptTokens,
      completionTokens,
      costUsd: calcCost(this.defaultModel, promptTokens, completionTokens),
      durationMs: Date.now() - startedAt
    };
  }
}
