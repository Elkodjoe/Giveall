import { buildAppreciationPrompt, type AppreciationInput } from '../engine/appreciationGenerator';

/**
 * Direct client-side call to a locally running Ollama server — NOT routed
 * through functions/src/generateAppreciation.ts. That Cloud Function can't
 * reach this at all: Ollama listens on the developer's own machine, and a
 * deployed Cloud Function runs on Google's infrastructure with no route to
 * localhost. This is purely a local-dev stand-in for testing the
 * Appreciation Generator without needing the Blaze plan or a paid
 * Anthropic/OpenAI key — see docs/03-power-ups.md.
 *
 * Only usable when running the app on the same machine as the Ollama
 * server (e.g. `expo start --web` on a dev machine with `ollama serve`
 * running). Won't work from a phone/simulator unless OLLAMA_HOST is
 * reachable from that device.
 */
const OLLAMA_BASE_URL = process.env.EXPO_PUBLIC_OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.EXPO_PUBLIC_OLLAMA_MODEL ?? 'llama3.2:3b';

export interface OllamaResult {
  text: string;
  provider: 'ollama';
  model: string;
}

export async function generateAppreciationViaOllama(input: AppreciationInput): Promise<OllamaResult> {
  const { system, user } = buildAppreciationPrompt(input);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const text = data.message?.content?.trim();
  if (!text) throw new Error('Empty Ollama response');

  return { text, provider: 'ollama', model: OLLAMA_MODEL };
}
