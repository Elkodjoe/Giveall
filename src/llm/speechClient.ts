/**
 * Builds a URL that returns spoken audio (audio/mpeg) for a line of text,
 * served by the Cloudflare Worker proxy's `/speak` route (ElevenLabs TTS,
 * key held server-side — see proxy/). The URL is playable directly by
 * expo-av / an <audio> element, so callers hand it straight to a player
 * rather than fetching bytes themselves.
 *
 * Returns null when the proxy isn't configured (same env var as the text
 * generator) — callers hide the "hear it" affordance in that case.
 */
const MAX_SPEAK_CHARS = 500;

export function isSpeechConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_APPRECIATION_PROXY_URL);
}

export function speechUrlFor(text: string): string | null {
  const base = process.env.EXPO_PUBLIC_APPRECIATION_PROXY_URL;
  const token = process.env.EXPO_PUBLIC_APPRECIATION_PROXY_TOKEN;
  const trimmed = text.trim();
  if (!base || !trimmed) return null;

  const params = new URLSearchParams({ text: trimmed.slice(0, MAX_SPEAK_CHARS) });
  if (token) params.set('t', token);
  return `${base.replace(/\/+$/, '')}/speak?${params.toString()}`;
}
