import type { LoveLanguage } from './types';

export const APPRECIATION_SYSTEM_PROMPT = `You turn a generic compliment into one specific, personal moment.
Rules:
- Never use generic adjectives alone ("amazing", "great", "perfect") without a concrete observation attached.
- Output must name a specific behavior, habit, or moment — something only someone who actually knows this person would notice.
- Output must state the effect it has on the speaker ("it makes me feel...", "it reminds me...").
- Keep it to one or two sentences. No greeting, no sign-off, just the line itself.
- Match the tone to the user's dominant love language when provided.`;

export interface AppreciationInput {
  genericCompliment: string;
  loveLanguage?: LoveLanguage;
  /** Optional Memory Vault detail or Curiosity Card answer to ground the output in something real. */
  context?: string;
}

export interface LlmChatRequest {
  system: string;
  user: string;
}

/**
 * Assembles a ready-to-send LLM request. The actual provider call is
 * intentionally NOT wired here — pick a provider (Anthropic/OpenAI/etc.) and
 * an SDK in a later pass; this function only builds the prompt payload.
 */
export function buildAppreciationPrompt(input: AppreciationInput): LlmChatRequest {
  const lines = [`Input: "${input.genericCompliment}"`];
  if (input.loveLanguage) lines.push(`Love language: ${input.loveLanguage}`);
  if (input.context) lines.push(`Relevant detail: ${input.context}`);
  lines.push('Output:');

  return {
    system: APPRECIATION_SYSTEM_PROMPT,
    user: lines.join('\n'),
  };
}
