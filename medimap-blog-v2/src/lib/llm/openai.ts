import { LlmError, calcCost, withTimeout } from './base';
import type { LlmGenerateInput, LlmGenerateOutput, LlmProvider } from './base';

export class OpenAiProvider implements LlmProvider {
  readonly engine = 'chatgpt' as const;
  readonly defaultModel: string;

  constructor(private readonly apiKey: string, model = 'gpt-4o-mini') {
    if (!apiKey) throw new LlmError('OPENAI_API_KEY missing', 'chatgpt', 'auth');
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
      temperature: input.temperature ?? 0.4,
      max_tokens: input.maxTokens ?? 1500,
      ...(input.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {})
    };

    const res = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }),
      60_000,
      'chatgpt'
    );

    if (!res.ok) {
      const kind = res.status === 401 ? 'auth' : res.status === 429 ? 'rate_limit' : 'server';
      throw new LlmError(`OpenAI ${res.status}`, 'chatgpt', kind, res.status);
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const promptTokens = json.usage.prompt_tokens;
    const completionTokens = json.usage.completion_tokens;
    return {
      engine: 'chatgpt',
      model: this.defaultModel,
      text: json.choices[0]?.message?.content ?? '',
      promptTokens,
      completionTokens,
      costUsd: calcCost(this.defaultModel, promptTokens, completionTokens),
      durationMs: Date.now() - startedAt
    };
  }
}
