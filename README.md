# Giveall — Relationship Fitness / Love OS

A 90-second daily relationship fitness app. See `docs/00-product-overview.md` for the full product spec (onboarding flow, rules-engine decision matrix, power-ups) — start there before touching code.

## What's here

- `docs/` — designer/dev handoff spec: onboarding flow copy + rationale, the Love OS decision matrix, power-up prompts and copy rules.
- `src/engine/` — the rules engine as plain TypeScript, no React/RN dependency. Unit-tested (`src/engine/__tests__`). This is the reusable "brain" — safe to lift into a backend later if logic needs to move server-side.
- `src/data/` — onboarding question banks (attachment scenarios, love language forced-choice pairs).
- `src/components/`, `src/state/` — RN UI pieces for the onboarding flow.
- `app/` — Expo Router screens: Onboarding Screens 1–6, plus `checkin.tsx` (daily 90-second check-in), `bids.tsx` (Bid Tracker), and `curiosity.tsx` (Curiosity Card).
- `src/firebase/` — Firestore document types, security rules-matching collection helpers, and auth. Works without a Firebase project configured — see `docs/06-firebase-provisioning.md`.

## Getting started

```bash
npm install
npm run start   # opens Expo dev tools; press i/a/w for iOS/Android/web
npm test        # runs the engine unit tests
```

## Status

Onboarding flow (Screens 1–6), daily check-in, Bid Tracker, and Curiosity Card screens are all built, running the full rules engine (decision matrix, bid tracker, curiosity ladder, recalibration, appreciation prompt builder, retention notification copy), unit-tested, and **verified end-to-end against a real, live Firebase project** (`giveall-app`) — not just the client-only demo path. Firestore database, security rules, indexes, Anonymous Auth, seed data, and a registered web app are all deployed; `.env` is populated. See `docs/06-firebase-provisioning.md` for exact status and a real security-rules bug that deployment surfaced and got fixed (create-vs-read rule split for user-owned collections). Everything still degrades gracefully to client-only if Firebase isn't configured (e.g. a fresh clone with no `.env`).

The Appreciation Generator (`src/engine/appreciationGenerator.ts`'s prompt, wrapped by `functions/src/generateAppreciation.ts`) supports both Anthropic and OpenAI with automatic fallback — only one API key needs to be configured. `app/payoff.tsx` calls it live and falls back to a static example line if it fails.

**Cloud Functions are written but not deployed** — `nightlyRecalculateWeights`, `activatePartnership`, `validateProfile`, and `generateAppreciation` all need the Blaze billing plan, deliberately deferred (needs a payment method the user isn't ready to add). Nothing in the app breaks without them; the Appreciation Generator just stays on its fallback line.
