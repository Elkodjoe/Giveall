# Giveall — Relationship Fitness / Love OS

A 90-second daily relationship fitness app. See `docs/00-product-overview.md` for the full product spec (onboarding flow, rules-engine decision matrix, power-ups) — start there before touching code.

## What's here

- `docs/` — designer/dev handoff spec: onboarding flow copy + rationale, the Love OS decision matrix, power-up prompts and copy rules.
- `src/engine/` — the rules engine as plain TypeScript, no React/RN dependency. Unit-tested (`src/engine/__tests__`). This is the reusable "brain" — safe to lift into a backend later if logic needs to move server-side.
- `src/data/` — onboarding question banks (attachment scenarios, love language forced-choice pairs).
- `src/components/`, `src/state/` — RN UI pieces for the onboarding flow.
- `app/` — Expo Router screens implementing Onboarding Screens 1–6.

## Getting started

```bash
npm install
npm run start   # opens Expo dev tools; press i/a/w for iOS/Android/web
npm test        # runs the engine unit tests
```

## Status

Onboarding flow (Screens 1–6) and the core rules engine (decision matrix, bid tracker, curiosity ladder, recalibration, appreciation prompt builder, retention notification copy) are scaffolded and unit-tested. Not yet wired: persistence/backend, an actual LLM call for the Appreciation Generator (see `src/engine/appreciationGenerator.ts` — prompt is ready, provider call is a TODO), and daily check-in / Bid Tracker screens beyond onboarding.
