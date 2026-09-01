# Appreciation Generator proxy (Cloudflare Worker)

A ~150-line Cloudflare Worker that stands between the app and an LLM
provider (Anthropic or OpenAI) so the **API key stays server-side** and the
Appreciation Generator can run live in production **without the Firebase
Blaze plan**. The Worker's free tier (100k requests/day) is far more than
this app needs.

The prompt is built from `../src/engine/appreciationGenerator.ts` — the
same module the optional Cloud Function (`functions/src/generateAppreciation.ts`)
uses, so there is one source of truth for the prompt.

## One-time setup

```sh
cd proxy
npm install
npx wrangler login                        # opens a browser; free Cloudflare account
npx wrangler secret put ANTHROPIC_API_KEY  # paste the key when prompted
# optional: npx wrangler secret put OPENAI_API_KEY     (fallback text provider)
# optional: npx wrangler secret put ELEVENLABS_API_KEY (enables the /speak route)
# optional: npx wrangler secret put APP_TOKEN          (shared token, see below)
npm run deploy
```

`wrangler deploy` prints the Worker URL, e.g.
`https://giveall-appreciation-proxy.<your-subdomain>.workers.dev`.

Put that URL in the app's `.env`:

```
EXPO_PUBLIC_APPRECIATION_PROXY_URL=https://giveall-appreciation-proxy.<your-subdomain>.workers.dev
# only if you set an APP_TOKEN secret:
EXPO_PUBLIC_APPRECIATION_PROXY_TOKEN=<the same token>
```

Rebuild/restart Expo so the new env var is inlined. `app/payoff.tsx` will
now use the proxy when the Cloud Function isn't available.

## Abuse protection

- `max_tokens` is capped at 200 and the request body length is bounded, so
  a single call can't run up a large bill.
- Set `ALLOWED_ORIGINS` in `wrangler.toml` (`[vars]`) to the app/marketing
  origins once they're stable, to stop other sites calling it from a browser.
- For a stronger gate, set the `APP_TOKEN` secret; the app then sends it as
  `x-app-token` and the Worker rejects anything else with 401. Note this
  token still ships in the app bundle — it raises the bar, it isn't a real
  secret. Cloudflare's dashboard rate-limiting rules are the durable fix if
  abuse ever happens.

## Local dev

```sh
npm run dev   # wrangler dev, serves on http://localhost:8787
```

Point `EXPO_PUBLIC_APPRECIATION_PROXY_URL` at `http://localhost:8787` to
test end-to-end without deploying. `npm run typecheck` type-checks the
Worker against `@cloudflare/workers-types`.

## Routes

### `POST /` — appreciation text

JSON body (matches `AppreciationInput`):

```json
{ "genericCompliment": "You are wonderful.", "loveLanguage": "words", "context": "optional real detail" }
```

Success `200`: `{ "text": "...", "provider": "anthropic" }`
Errors: `400` bad input, `401` bad/missing token, `413` input too long,
`502` all providers failed / none configured.

### `POST /speak` or `GET /speak?text=...` — spoken audio

Returns `audio/mpeg` bytes from ElevenLabs (`eleven_multilingual_v2`, so it
handles the appreciation line in any of the app's 7 languages). The `GET`
form exists so a player can stream it straight from the URL; when
`APP_TOKEN` is set, pass it as `?t=<token>` on the `GET`.

Requires the `ELEVENLABS_API_KEY` secret. Optional `ELEVENLABS_VOICE_ID`
var overrides the default voice (ElevenLabs "Rachel"). Input capped at 500
characters. `502` if the key is missing or ElevenLabs errors.
