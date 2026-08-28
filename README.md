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

Onboarding flow (Screens 1–6) and the daily check-in screen are built, running the full rules engine (decision matrix, bid tracker, curiosity ladder, recalibration, appreciation prompt builder, retention notification copy), all unit-tested, and verified end-to-end in the actual running app (Expo web). The check-in screen persists to Firestore when configured (`src/firebase/profileSeeding.ts` builds the first `ProfileDoc` from onboarding answers, `addDailyCheckin()` writes the check-in) and degrades gracefully to client-only when it isn't — no Firebase project exists yet, see `docs/06-firebase-provisioning.md`. `app/bids.tsx` (Bid Tracker) logs Gottman bids and shows the weekly toward-ratio via `summarizeWeek()`, also persisting/seeding from Firestore when configured. `app/curiosity.tsx` (Curiosity Card) surfaces one conversation prompt at a time gated by the intimacy ladder, marking completion via a newly-added `curiosity_card_progress` collection (found missing rules/helpers while wiring this — same class of gap as `partnerships`, see `docs/04-firebase-schema.md`). `app/ritual-time.tsx` now writes `UserDoc` (via `createUserIfNeeded()`) on onboarding completion, and `app/curiosity.tsx` reads its `createdAt` to compute the real `weeksSinceStart` for the intimacy ladder — falls back to week 0 only when Firebase isn't configured. Not yet wired: an actual LLM call for the Appreciation Generator (see `src/engine/appreciationGenerator.ts` — prompt is ready, provider call is a TODO), and a numeric mood-score slider (check-in currently derives `moodScore` from the mood label via a fixed lookup table).
