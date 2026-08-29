import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import type { AppreciationInput } from '../engine/appreciationGenerator';
import type { LlmProvider } from '../engine/llmProvider';

export interface AppreciationResult {
  text: string;
  provider: LlmProvider;
}

/**
 * Calls the generateAppreciation Cloud Function (functions/src/generateAppreciation.ts).
 * Throws if functions isn't configured (see config.ts) or the function
 * call itself fails (not deployed yet, no provider configured, network
 * error, etc.) — callers are expected to fall back to a static example on
 * error rather than surface a raw failure, same pattern as the rest of the
 * app's best-effort Firestore writes.
 */
export async function generateAppreciation(input: AppreciationInput): Promise<AppreciationResult> {
  if (!functions) throw new Error('Firebase not configured');
  const call = httpsCallable<AppreciationInput, AppreciationResult>(functions, 'generateAppreciation');
  const result = await call(input);
  return result.data;
}
