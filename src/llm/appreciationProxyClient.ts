import type { AppreciationInput } from '../engine/appreciationGenerator';
import type { LlmProvider } from '../engine/llmProvider';

/**
 * Calls the Cloudflare Worker proxy (see proxy/) that holds the LLM API key
 * server-side. This is the production path for the Appreciation Generator
 * when the Firebase Cloud Function isn't deployed (Blaze deferred) — unlike
 * src/llm/ollamaClient.ts it works from a real device, not just the dev
 * machine.
 *
 * Configured via EXPO_PUBLIC_APPRECIATION_PROXY_URL (and optionally
 * EXPO_PUBLIC_APPRECIATION_PROXY_TOKEN). Throws when unset or on any
 * failure — callers fall back to the next source / the static line, same
 * best-effort pattern as the rest of the app.
 */
export interface ProxyAppreciationResult {
  text: string;
  provider: LlmProvider;
}

export function isAppreciationProxyConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_APPRECIATION_PROXY_URL);
}

export async function generateAppreciationViaProxy(
  input: AppreciationInput,
): Promise<ProxyAppreciationResult> {
  const url = process.env.EXPO_PUBLIC_APPRECIATION_PROXY_URL;
  const token = process.env.EXPO_PUBLIC_APPRECIATION_PROXY_TOKEN;
  if (!url) throw new Error('Appreciation proxy not configured');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-app-token': token } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Appreciation proxy failed: ${response.status} ${detail}`.trim());
  }

  const data = (await response.json()) as { text?: string; provider?: LlmProvider };
  if (!data.text) throw new Error('Appreciation proxy returned no text');
  return { text: data.text, provider: data.provider ?? 'anthropic' };
}
