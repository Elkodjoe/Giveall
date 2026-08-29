import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { buildAppreciationPrompt } from '../../src/engine/appreciationGenerator';
import type { AppreciationInput } from '../../src/engine/appreciationGenerator';
import { orderAvailableProviders, type LlmProvider } from '../../src/engine/llmProvider';

// Both declared, but only one needs a real value — see
// docs/06-firebase-provisioning.md for the two-secret setup and what
// happens if neither is configured.
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
const openaiApiKey = defineSecret('OPENAI_API_KEY');

const PRIMARY_PROVIDER: LlmProvider = 'anthropic';

async function callAnthropic(system: string, user: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 200,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Anthropic response content type');
  return block.text.trim();
}

async function callOpenAI(system: string, user: string, apiKey: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('Empty OpenAI response');
  return text.trim();
}

const PROVIDER_CALLS: Record<LlmProvider, (system: string, user: string, apiKey: string) => Promise<string>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
};

/**
 * Wraps buildAppreciationPrompt() (src/engine/appreciationGenerator.ts,
 * kept provider-agnostic on purpose) with an actual model call. Tries
 * PRIMARY_PROVIDER first, falls back to the other provider if its key is
 * missing or the call itself fails — a single provider outage or an unset
 * key doesn't take the feature down, as long as at least one is configured.
 */
export const generateAppreciation = onCall(
  { secrets: [anthropicApiKey, openaiApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign-in required.');
    }

    const input = request.data as AppreciationInput;
    if (!input?.genericCompliment) {
      throw new HttpsError('invalid-argument', 'genericCompliment is required.');
    }

    const { system, user } = buildAppreciationPrompt(input);

    const keys: Record<LlmProvider, string> = {
      anthropic: anthropicApiKey.value(),
      openai: openaiApiKey.value(),
    };
    const order = orderAvailableProviders(PRIMARY_PROVIDER, {
      anthropic: Boolean(keys.anthropic),
      openai: Boolean(keys.openai),
    });

    const errors: string[] = [];
    for (const provider of order) {
      try {
        const text = await PROVIDER_CALLS[provider](system, user, keys[provider]);
        return { text, provider };
      } catch (err) {
        errors.push(`${provider}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new HttpsError(
      'unavailable',
      errors.length > 0
        ? `All configured providers failed. ${errors.join('; ')}`
        : 'No LLM provider configured — set ANTHROPIC_API_KEY and/or OPENAI_API_KEY.',
    );
  },
);
