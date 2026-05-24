/**
 * LLM provider factory — env 기반으로 적합한 provider 반환.
 *
 * 사용법:
 *   const llm = getProvider();                  // env LLM_PROVIDER 기반
 *   const llm = getProvider('claude');          // 명시
 *   const all = getAllAvailableProviders();     // 4-엔진 측정용
 */

import type { LlmEngine } from '../types';
import type { LlmProvider } from './base';
import { OpenAiProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { PerplexityProvider } from './perplexity';
import { StubProvider } from './stub';

function tryCreate(engine: LlmEngine): LlmProvider | null {
  try {
    switch (engine) {
      case 'chatgpt':
        return new OpenAiProvider(process.env.OPENAI_API_KEY ?? '');
      case 'claude':
        return new AnthropicProvider(process.env.ANTHROPIC_API_KEY ?? '');
      case 'gemini':
        return new GeminiProvider(process.env.GOOGLE_API_KEY ?? '');
      case 'perplexity':
        return new PerplexityProvider(process.env.PERPLEXITY_API_KEY ?? '');
    }
  } catch {
    return null;
  }
}

export function getProvider(engine?: LlmEngine): LlmProvider {
  const selected = engine ?? (process.env.LLM_PROVIDER as LlmEngine | undefined) ?? 'stub';
  if (selected === ('stub' as LlmEngine)) return new StubProvider();
  if (selected === 'stub') return new StubProvider();
  return tryCreate(selected as LlmEngine) ?? new StubProvider(selected);
}

export function getAllAvailableProviders(): LlmProvider[] {
  const engines: LlmEngine[] = ['chatgpt', 'claude', 'gemini', 'perplexity'];
  const providers = engines.map((e) => tryCreate(e)).filter((p): p is LlmProvider => p !== null);
  return providers.length > 0 ? providers : [new StubProvider()];
}

// =========================================
// 비용 가드레일 — 일일 한도 체크
// =========================================

import { getServerClient } from '../supabase';

export async function checkDailyCostGuard(tenantId: string, maxUsd: number): Promise<{ ok: boolean; spentUsd: number }> {
  const client = getServerClient();
  if (!client) return { ok: true, spentUsd: 0 };
  const { data, error } = await client
    .from('v_daily_llm_cost')
    .select('cost_usd')
    .eq('tenant_id', tenantId)
    .eq('day_kst', new Date().toISOString().slice(0, 10))
    .maybeSingle();
  if (error) return { ok: true, spentUsd: 0 };
  const spent = Number(data?.cost_usd ?? 0);
  return { ok: spent < maxUsd, spentUsd: spent };
}

export async function logLlmCall(
  tenantId: string,
  result: { engine: LlmEngine; model: string; promptTokens: number; completionTokens: number; costUsd: number; durationMs: number },
  status: 'ok' | 'error' | 'blocked' = 'ok',
  error?: string
): Promise<void> {
  const client = getServerClient();
  if (!client) return;
  await client.from('llm_call_logs').insert({
    tenant_id: tenantId,
    engine: result.engine,
    model: result.model,
    prompt_tokens: result.promptTokens,
    completion_tokens: result.completionTokens,
    cost_usd: result.costUsd,
    duration_ms: result.durationMs,
    status,
    error
  });
}
