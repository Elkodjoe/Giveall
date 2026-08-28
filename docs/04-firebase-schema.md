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

- **Onboarding** (`src/engine/onboardingScoring.ts`) produces the initial primary/secondary categories from the 6 attachment questions + 4 love-language pairs. `src/firebase/profileSeeding.ts`'s `buildInitialProfile()` (wired into `app/checkin.tsx`'s first visit) converts those into a full `ProfileDoc`: `buildAttachmentScores()` normalizes the raw answer counts into the `attachmentScores`/`attachmentScoresRaw` pair, and `buildInitialLoveLanguageWeights()` seeds `loveLanguageWeights` by giving the primary language 0.5 and splitting the rest evenly, for the nightly EMA job to blend against later.
- **Nightly recalibration** (`functions/src/recalculateWeights.ts`) reads the last 7 days of `action_logs`, blends each language's average self-reported mood delta into its existing weight via an EMA (`EMA_ALPHA = 0.3`), and writes the normalized result back. If the top-weighted language changes, it writes a `recalibration_events` doc rather than silently updating — the client is expected to read that and show the "We learned you feel more loved by X..." message from `docs/02-love-os-brain.md #3` before or as it adopts the new primary language for `decisionMatrix.ts` prescriptions.
- **`src/engine/recalibration.ts`** (the client-side, 5-consecutive-day-streak check) and the nightly EMA job are two different recalibration strategies for the same product rule, not duplicates to merge: the client-side one can run offline/instantly against locally logged `DailyFeedback`, while the nightly job is the authoritative, cross-session version once a user is on Firebase. Keep both — prefer the nightly job's result when both are available.

## Cloud Functions (`functions/`)

- `nightlyRecalculateWeights` — scheduled (`0 2 * * *`, i.e. 2am UTC), iterates every `profiles` doc directly (not via `users`) and recalculates `loveLanguageWeights`. Requires `MIN_LOGS_FOR_RECALIBRATION = 5` action_logs in the trailing 7 days; below that it skips. Groups logs by `ActionLogDoc.loveLanguageType` (denormalized onto the log at write time — see `logAction()` in `src/firebase/collections.ts` — to avoid an N+1 lookup against `suggested_actions` per log entry), computes each language's average `partnerMoodDelta`, shifts+normalizes those into a `targetWeights` distribution, then blends that into the existing weights via EMA (`EMA_ALPHA = 0.3`) rather than replacing them outright — a single noisy week can't swing prescriptions abruptly. **Every run** — skip or recalibration — writes a `recalibration_events` doc (not in the original collection list; added because "never recalibrate silently" is a product rule from `docs/02-love-os-brain.md #3`, and this makes the full history queryable rather than only console-logged). A recalibration event includes `topLanguageChanged: boolean` so the client can decide when to show the "We learned you feel more loved by X..." message.
- `validateProfile` — Firestore trigger on `profiles/{userId}` **creation** (not every write — `attachmentScores` is set once at onboarding and never touched again; the nightly job only updates `loveLanguageWeights`). Delegates to `src/firebase/attachmentScores.ts`'s `validateAttachmentScores()` (independently unit-tested), which checks both that the four components actually sum to ~1.0 *and* that the stored `_sum` field agrees — catches a stale/wrong `_sum` even when the components themselves are fine. Writes a `validation_events` doc on failure rather than only logging to the Cloud Functions console.
- `activatePartnership` — Firestore trigger on `partnerships/{id}` writes; flips `status` from `pending` to `active` once both `optIns` are true (this write is blocked from clients in `firestore.rules`), and mirrors `partnerId` onto both `users` docs.

`recalibration_events` and `validation_events` are audit-only collections — no client code reads them yet, and they have no entry in `src/firebase/types.ts` or `firestore.rules` (not client-readable; only Cloud Functions with admin credentials write to them).

Neither function is deployed yet — `functions/package.json` has the `deploy` script once a Firebase project is provisioned; see `06-firebase-provisioning.md`.

## Seeding suggested_actions and curiosity_cards

`scripts/seed/suggested_actions.json` and `scripts/seed/curiosity_cards.json` now hold the actual seed content from the handoff (an earlier pass had to invent placeholder content because no real seed JSON had come through yet). `curiosity_cards` ids intentionally match the hardcoded `CARDS` array in `src/engine/curiosityLadder.ts` — edit both if you change one.

Run `npm run seed` with `GOOGLE_APPLICATION_CREDENTIALS` pointed at a service account key to load them into Firestore (see `scripts/seed/import-seed-data.ts`).

**Coverage gap — fixed**: the seed originally had only 4 entries and didn't cover `fearful`- or `secure`-attachment `safe_score` actions distinctly (it lumped `secure` in with `anxious`-specific copy). Added `act_vuln_001` (fearful) and `act_direct_001` (secure), copied verbatim from `src/engine/decisionMatrix.ts`'s `SAFE_SCORE_STRATEGY`, so the seed data and the client-side engine now agree on all four attachment styles.

## Locked schema v2 — naming conflicts resolved

The three naming conflicts flagged in an earlier pass are now resolved and reflected in `src/firebase/types.ts`:

- **`attachmentStyle` format** → snake_case enum, no hyphens: `'secure' | 'anxious_preoccupied' | 'dismissive_avoidant' | 'fearful_avoidant'` (type `FirestoreAttachmentStyle`). This is distinct from `src/engine/types.ts`'s shorter `AttachmentStyle` union (`'secure' | 'anxious' | 'avoidant' | 'fearful'`), which was **not** renamed — that would be an invasive rename across already-tested engine code for a naming-only difference. `attachmentStyleToFirestore()` / `attachmentStyleFromFirestore()` in `src/firebase/types.ts` convert between the two.
- **`attachmentScores` normalization** → split into two fields: `attachmentScores` (normalized floats summing to 1.0, with an explicit `_sum` field) and `attachmentScoresRaw` (unnormalized counts, debugging/audit only — never read by product logic). `functions/src/validateProfile.ts` is a Firestore trigger that logs a warning if `_sum` drifts more than ±0.02 from 1.0.
- **`mood` field on `daily_checkins`** → split into `moodScore` (int 1-10, queryable — e.g. `where moodScore < 5`) and `moodLabel` (one of 9 enum values: hopeful/joyful/calm/neutral/anxious/lonely/disconnected/triggered/loved). Also added `bid_logged_today: boolean` per the locked schema.

Also renamed `PartnershipDoc.participants` → `users` (locked schema's field name) — updated in `firestore.rules`, `src/firebase/collections.ts`, and `functions/src/activatePartnership.ts` together.

`firestore.indexes.json` now exists at the repo root with composite indexes for the `userId` + date/timestamp range queries in `collections.ts` (plus one for `memory_vault`'s unused-entries query, not in the original list but needed for the same reason). Not deployed yet — see `06-firebase-provisioning.md`.
