import { LlmError, calcCost, withTimeout } from './base';
import type { LlmGenerateInput, LlmGenerateOutput, LlmProvider } from './base';

export class GeminiProvider implements LlmProvider {
  readonly engine = 'gemini' as const;
  readonly defaultModel: string;

  constructor(private readonly apiKey: string, model = 'gemini-1.5-flash') {
    if (!apiKey) throw new LlmError('GOOGLE_API_KEY missing', 'gemini', 'auth');
    this.defaultModel = model;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const startedAt = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel}:generateContent?key=${this.apiKey}`;
    const body = {
      systemInstruction: input.systemPrompt
        ? { role: 'system', parts: [{ text: input.systemPrompt }] }
        : undefined,
      contents: [{ role: 'user', parts: [{ text: input.userPrompt }] }],
      generationConfig: {
        temperature: input.temperature ?? 0.4,
        maxOutputTokens: input.maxTokens ?? 1500,
        ...(input.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {})
      }
    };

    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }),
      60_000,
      'gemini'
    );

    if (!res.ok) {
      const kind = res.status === 401 || res.status === 403 ? 'auth' : res.status === 429 ? 'rate_limit' : 'server';
      throw new LlmError(`Gemini ${res.status}`, 'gemini', kind, res.status);
    }

    const json = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
    };

    const text = json.candidates[0]?.content?.parts?.[0]?.text ?? '';
    const promptTokens = json.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
    return {
      engine: 'gemini',
      model: this.defaultModel,
      text,
      promptTokens,
      completionTokens,
      costUsd: calcCost(this.defaultModel, promptTokens, completionTokens),
      durationMs: Date.now() - startedAt
    };
  }
}
