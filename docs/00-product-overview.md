# GiveAll — Relationship Fitness / Love OS

**One-liner:** Love is a daily practice. GiveAll is a 90-second daily fitness app for your relationship — it reads your Attachment style, Love Language, and real-time relational data, then prescribes one small, specific action a day to help you feel (and make someone feel) Attractive, Valued, and Wanted. Brand story: "Give All of your love, daily. Generous, warm, abundant." (repo/package name stays lowercase `giveall`, matching the GitHub repo — see `05-design-tokens.md` for the display brand.)

## Core vocabulary (use consistently across product, copy, and code)

| Term | Definition |
|---|---|
| **Mode** | Which relationship stage the user is in: Crush / New (0-6mo) / LTR / Healing. Set in onboarding Screen 2, branches everything downstream. |
| **Attachment Style** | Secure / Anxious / Avoidant / Fearful — derived from 6 scenario questions, not self-report labels. |
| **Love Language** | How the user *receives* love best — derived from forced-choice pairs, not ranking. |
| **AVW Scores** | The three core health metrics tracked daily: `safe_score`, `seen_score`, `sought_score` (Attractive/Valued/Wanted proxies — see below). |
| **Memory Vault** | Store of specific details the user logs about their partner/crush (things mentioned in passing), used to generate "Recall Detail" actions. |
| **Desire Inventory** | Ranked list of what makes the user (or their partner) feel wanted — used for `sought_score` prescriptions. |
| **Bid** | A Gottman "bid for connection" — small partner behaviors the user logs and classifies as Toward / Away / Against. |
| **Curiosity Card** | A daily/weekly conversation prompt, delivered on an intimacy ladder (Weeks 1-4 → 5-12 → 12+). |
| **Micro-Attunement** | The single prescribed action of the day — always specific, small, and attachment-tailored. |

## The three scores (AVW)

- **`safe_score`** — do they feel emotionally safe / secure in this connection? Lowest score = highest priority; drives attachment-tailored repair actions.
- **`seen_score`** — do they feel *known*, not just liked? Low score → pull from Memory Vault, prescribe a "Recall Detail" action.
- **`sought_score`** — do they feel actively desired/chosen, not just tolerated? Low score → pull from Desire Inventory, prescribe a specific wanting action.

Scores are 0–100 in the client-side engine (`src/engine/types.ts`'s `AvwScores`), updated by: onboarding baseline, daily check-in self-report, Bid Tracker ratio, and Curiosity Card engagement. The persisted `daily_checkins` Firestore doc (`src/firebase/types.ts`) uses a 1–10 raw input scale for `seen_score`/`safe_score`/`sought_score` (what a slider UI shows) — `src/engine/scale.ts`'s `toAvwScore()`/`toCheckinScore()` (plus batch helpers `checkinToAvw()`/`avwToCheckin()`) convert between the two, rounding and clamping since both are meant to be integers. Always go through them rather than mixing raw and engine-scale values. See `02-love-os-brain.md` for the full decision matrix.

## Docs in this folder

1. `01-onboarding-flow.md` — the first 90 seconds, screen by screen, with copy and rationale.
2. `02-love-os-brain.md` — the rules engine: inputs, decision matrix, recalibration logic, bid tracker, curiosity ladder.
3. `03-power-ups.md` — AI appreciation-generator prompt, retention notification rules, privacy guardrail copy.
4. `04-firebase-schema.md` — Firestore collections, the locked schema decisions, and known gaps.
5. `05-design-tokens.md` — the GiveAll color/typography/spacing tokens and where they're applied.
6. `06-firebase-provisioning.md` — manual steps to create and deploy the Firebase project (needs your Google account).
7. `07-internationalization.md` — how the 7-language i18n setup works, what stays English-only, and why.

## Code scaffold

`src/engine/` contains the rules engine as **framework-agnostic TypeScript** — no React/RN imports — so it can be unit-tested standalone and reused if the client changes (RN today, could be a backend service later). `app/` is the Expo Router onboarding flow, screens 1–6, wired to the engine.
