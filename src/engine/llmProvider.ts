export type LlmProvider = 'anthropic' | 'openai';

export interface ProviderAvailability {
  anthropic: boolean;
  openai: boolean;
}

/**
 * Orders providers primary-first, dropping any without a configured key.
 * Pure so it's unit-testable without mocking either SDK — the actual API
 * calls live in functions/src/generateAppreciation.ts, which is the only
 * place secrets and network calls happen.
 */
export function orderAvailableProviders(
  primary: LlmProvider,
  availability: ProviderAvailability,
): LlmProvider[] {
  const all: LlmProvider[] = primary === 'anthropic' ? ['anthropic', 'openai'] : ['openai', 'anthropic'];
  return all.filter((p) => availability[p]);
}
