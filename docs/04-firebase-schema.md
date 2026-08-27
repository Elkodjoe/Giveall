# Firebase Schema & Nightly Recalibration

Persistence layer added on top of the rules engine in `src/engine/` (that engine stays framework- and backend-agnostic — nothing here changes it). This doc reconciles the Firestore collections from the designer/dev handoff with the client-side engine's model, since the two use different shapes for the same concepts.

## Collections (see `src/firebase/types.ts`, rules in `firestore.rules`)

| Collection | Shape | Notes |
|---|---|---|
| `users` | `UserDoc` | Auth-linked profile: persona, notification time, subscription tier, partner link. |
| `profiles` | `ProfileDoc` | Attachment + love-language **distributions** (see below), desire inventory. |
| `daily_checkins` | `DailyCheckinDoc` | Daily 1-5 AVW self-report + mood + tags. |
| `bids` | `BidDoc` | Gottman bid log — same concept as `src/engine/bidTracker.ts`, persisted form. |
| `suggested_actions` | `SuggestedActionDoc` | Public, seeded catalog of prescribable actions (not user-authored). |
| `action_logs` | `ActionLogDoc` | A user's record of being shown/completing a `suggested_actions` entry, with self-reported mood delta. |
| `curiosity_cards` | `CuriosityCardDoc` | Public, seeded prompt catalog — `level` (1/2/3) maps to `CuriosityTier` in `src/engine/curiosityLadder.ts`. |
| `memory_vault` | `MemoryVaultDoc` | Same concept as `MemoryVaultEntry` in `src/engine/types.ts`, persisted form. |
| `partnerships` | `PartnershipDoc` | Double opt-in linking. **Not in the original handoff** — added because `firestore.rules`' `/profiles` partner-read check referenced a `partnerships` collection that had no rules of its own; see rules file comment. |

## Reconciling categorical (engine) vs. continuous (Firestore) models

`src/engine/types.ts` models attachment style and love language as a single **primary** (+ optional secondary/spike) category — that's what the onboarding flow in `app/` produces and what `decisionMatrix.ts` branches on.

`ProfileDoc` in Firestore instead stores **weight distributions** (`attachmentScores`, `loveLanguageWeights`, each summing to ~1.0) — this is what lets the nightly job in `functions/src/recalculateWeights.ts` nudge the profile gradually instead of flipping categories on one noisy day.

The two are meant to compose, not compete:

- **Onboarding** (`src/engine/onboardingScoring.ts`) produces the initial primary/secondary categories from the 6 attachment questions + 4 love-language pairs. When writing the first `ProfileDoc`, seed `loveLanguageWeights` by giving the primary language a high initial weight (e.g. 0.5) and splitting the rest evenly — there is no seed-weight helper yet; add one before wiring the write path.
- **Nightly recalibration** (`functions/src/recalculateWeights.ts`) reads the last 7 days of `action_logs`, blends each language's average self-reported mood delta into its existing weight via an EMA (`EMA_ALPHA = 0.3`), and writes the normalized result back. If the top-weighted language changes, it writes a `recalibration_events` doc rather than silently updating — the client is expected to read that and show the "We learned you feel more loved by X..." message from `docs/02-love-os-brain.md #3` before or as it adopts the new primary language for `decisionMatrix.ts` prescriptions.
- **`src/engine/recalibration.ts`** (the client-side, 5-consecutive-day-streak check) and the nightly EMA job are two different recalibration strategies for the same product rule, not duplicates to merge: the client-side one can run offline/instantly against locally logged `DailyFeedback`, while the nightly job is the authoritative, cross-session version once a user is on Firebase. Keep both — prefer the nightly job's result when both are available.

## Cloud Functions (`functions/`)

- `nightlyRecalculateWeights` — scheduled (`0 2 * * *`, i.e. 2am UTC), iterates all `users` and recalculates each one's `profiles.loveLanguageWeights`.
- `activatePartnership` — Firestore trigger on `partnerships/{id}` writes; flips `status` from `pending` to `active` once both `optIns` are true (this write is blocked from clients in `firestore.rules`), and mirrors `partnerId` onto both `users` docs.

Neither function is deployed yet — `functions/package.json` has the `deploy` script once a Firebase project is provisioned.

## Seeding suggested_actions and curiosity_cards

`scripts/seed/suggested_actions.json` and `scripts/seed/curiosity_cards.json` now hold the actual seed content from the handoff (an earlier pass had to invent placeholder content because no real seed JSON had come through yet). `curiosity_cards` ids intentionally match the hardcoded `CARDS` array in `src/engine/curiosityLadder.ts` — edit both if you change one.

Run `npm run seed` with `GOOGLE_APPLICATION_CREDENTIALS` pointed at a service account key to load them into Firestore (see `scripts/seed/import-seed-data.ts`).

**Coverage gap**: the real `suggested_actions` seed has only 4 entries and doesn't cover a `fearful`-attachment `safe_score` repair action, even though `src/engine/decisionMatrix.ts` prescribes a distinct "Safe Vulnerability" strategy for that case. Add a `fearful`-targeted entry (or an `"all"`-targeted one covering it) before relying on `suggested_actions` as the sole source for what the app shows — right now the client-side engine's hardcoded copy is the only thing covering that branch.

## Known naming inconsistencies not yet resolved

Different pasted fragments of the original handoff used different field names and value shapes for the same concepts. Rather than guess which was authoritative, `src/firebase/types.ts` picked one and these are flagged here for whoever owns the real handoff to confirm:

- **Love language keys**: standardized on `quality_time` (matches `src/engine/types.ts`'s existing `LoveLanguage` union and the richer seed data) — an earlier pasted Cloud Function pseudocode used `time` instead; `functions/src/recalculateWeights.ts` has been corrected to `quality_time`.
- **`attachmentStyle` value format**: `src/engine/types.ts`'s `AttachmentStyle` union (`'secure' | 'anxious' | 'avoidant' | 'fearful'`) is used throughout. A separate pasted `profiles_template` example used hyphenated labels like `"anxious-preoccupied"` instead — not adopted, since it doesn't match any type already in use.
- **`attachmentScores` normalization**: `ProfileDoc.attachmentScores` is documented as summing to ~1.0. The same `profiles_template` example showed raw, unnormalized values (`secure: 45, anxious: 70, avoidant: 30, fearful: 40`, summing to 185) — if the real scoring model is meant to be unnormalized counts rather than a probability distribution, `ProfileDoc` needs updating to match; not changed here since only one conflicting example exists.
- **`mood` field on `daily_checkins`**: `DailyCheckinDoc.mood` is a `number` (1-5). A pasted `daily_checkins_template` example showed `"mood": "hopeful"` (a string) and an additional `bid_logged_today: boolean` field not currently in `DailyCheckinDoc`. Not adopted — flagging for confirmation rather than picking one arbitrarily.

## What's still a placeholder

- No Figma design tokens file content was received — the dark theme in `app/` (`docs/01-onboarding-flow.md`'s screens) has not been reconciled with any alternate palette.
