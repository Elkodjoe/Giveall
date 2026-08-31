import { buildAppreciationPrompt, type AppreciationInput } from '../../src/engine/appreciationGenerator';
import { orderAvailableProviders, type LlmProvider } from '../../src/engine/llmProvider';

// Cloudflare Worker: a tiny key-holding proxy so the Appreciation Generator
// (docs/03-power-ups.md #1) can run live in production without the Firebase
// Blaze plan. The provider API key lives only here as a Worker secret and
// never ships in the app bundle. The prompt itself is built from the same
// src/engine/appreciationGenerator.ts the (still-optional) Cloud Function
// uses, so there is one source of truth for the prompt.
//
// Deploy: see proxy/README.md. In short —
//   npm --prefix proxy install
//   npx --prefix proxy wrangler secret put ANTHROPIC_API_KEY   (or OPENAI_API_KEY)
//   npm --prefix proxy run deploy
// then set EXPO_PUBLIC_APPRECIATION_PROXY_URL in the app's .env.

export interface Env {
  /** At least one of these must be set (as a secret, not a plain var). */
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  /** Optional shared token. When set, callers must send it as `x-app-token`. */
  APP_TOKEN?: string;
  /**
   * Optional comma-separated Origin allowlist for CORS. When unset the
   * proxy is open (`*`) — fine for a rate-limited, non-sensitive endpoint,
   * but set it to the app/marketing origins once they're known.
   */
  ALLOWED_ORIGINS?: string;
}

const MAX_COMPLIMENT_CHARS = 400;
const MAX_CONTEXT_CHARS = 600;
const PRIMARY_PROVIDER: LlmProvider = 'anthropic';

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowlist = env.ALLOWED_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let allowOrigin = '*';
  if (allowlist && allowlist.length > 0) {
    allowOrigin = origin && allowlist.includes(origin) ? origin : allowlist[0];
  }
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-app-token',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(body: unknown, status: number, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  });
}

async function callAnthropic(system: string, user: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((b) => b.type === 'text')?.text?.trim();
  if (!text) throw new Error('anthropic: empty response');
  return text;
}

async function callOpenAI(system: string, user: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('openai: empty response');
  return text;
}

const PROVIDER_CALLS: Record<LlmProvider, (system: string, user: string, key: string) => Promise<string>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request.headers.get('origin'), env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    if (env.APP_TOKEN && request.headers.get('x-app-token') !== env.APP_TOKEN) {
      return json({ error: 'unauthorized' }, 401, cors);
    }

    let input: AppreciationInput;
    try {
      input = (await request.json()) as AppreciationInput;
    } catch {
      return json({ error: 'invalid JSON body' }, 400, cors);
    }

    if (!input || typeof input.genericCompliment !== 'string' || !input.genericCompliment.trim()) {
      return json({ error: 'genericCompliment is required' }, 400, cors);
    }
    if (
      input.genericCompliment.length > MAX_COMPLIMENT_CHARS ||
      (input.context != null && String(input.context).length > MAX_CONTEXT_CHARS)
    ) {
      return json({ error: 'input too long' }, 413, cors);
    }

    const { system, user } = buildAppreciationPrompt({
      genericCompliment: input.genericCompliment,
      loveLanguage: input.loveLanguage,
      context: input.context,
    });

    const keys: Record<LlmProvider, string> = {
      anthropic: env.ANTHROPIC_API_KEY ?? '',
      openai: env.OPENAI_API_KEY ?? '',
    };
    const order = orderAvailableProviders(PRIMARY_PROVIDER, {
      anthropic: Boolean(keys.anthropic),
      openai: Boolean(keys.openai),
    });

    const errors: string[] = [];
    for (const provider of order) {
      try {
        const text = await PROVIDER_CALLS[provider](system, user, keys[provider]);
        return json({ text, provider }, 200, cors);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    return json(
      {
        error:
          errors.length > 0
            ? `all providers failed: ${errors.join('; ')}`
            : 'no provider configured — set ANTHROPIC_API_KEY and/or OPENAI_API_KEY',
      },
      502,
      cors,
    );
  },
};
