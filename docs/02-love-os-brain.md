# Love OS Brain — Algorithm Logic

A **rules engine + learning layer**. Start simple — no ML required on day one. The rules engine alone, fed by real user input, feels adaptive because the *inputs* change daily even when the *rules* don't.

Implementation: see `src/engine/` — pure TypeScript, no framework dependency, unit-testable.

---

## 1. Core inputs

- `mode`: Crush | New | LTR | Healing (Screen 2)
- `attachmentStyle`: Secure | Anxious | Avoidant | Fearful, plus a secondary "spike" style (Screen 3)
- `loveLanguage`: primary + secondary of Words | Acts | Gifts | QualityTime | Touch (Screen 4)
- `avwScores`: `{ safe: number, seen: number, sought: number }`, each 0–100
- `memoryVault`: array of `{ detail: string, date: string, tags: string[] }`
- `desireInventory`: ranked array of what makes the user/partner feel wanted
- `bidLog`: array of `{ description: string, response: 'toward' | 'away' | 'against', date: string }`
- `weeksSinceStart`: number, drives the Curiosity Card ladder

## 2. Decision matrix — attachment × lowest AVW score

Each day, compute the **lowest of the three AVW scores** — that's the priority axis. Then branch on `attachmentStyle` (for `safe_score`) or apply a universal rule (for `seen_score` / `sought_score`).

### If `safe_score` is lowest (highest priority overall — safety underlies the other two)

| Attachment style | Strategy | Tone | Example action |
|---|---|---|---|
| Anxious-Preoccupied | **Consistency + Reassurance** | Warm, predictable | "Morning voice note, same time daily: 'Thinking of you before your meeting'" |
| Dismissive-Avoidant | **Low-Pressure Space** | Light, no demand for reply | "No-reply-needed check-in: 'Saw this meme and thought of you, no need to reply'" |
| Fearful-Avoidant | **Safe Vulnerability** | Small, controlled share | "Share one small worry first, then appreciation — shows it's safe to be vulnerable" |
| Secure | **Direct Repair** | Plain, direct | "Ask directly: 'I felt a bit distant yesterday, can we reset tonight?'" |

### If `seen_score` is lowest

**Action = Recall Detail**, regardless of attachment style. Pull the most recent unused entry from Memory Vault.

> "Last week they mentioned [X]. Ask about it today."

### If `sought_score` is lowest

**Action = Specific Desire + Play**, regardless of attachment style. Pull the top unused entry from Desire Inventory.

> User ranked "being defended in public" as feeling wanted → "Today, compliment them in front of a friend."

### Tie-break rule

If two scores are tied for lowest, prioritize `safe` > `seen` > `sought` (safety is foundational; you can't feel truly seen or sought without it).

## 3. Dynamic recalibration — the moat

Static quizzes give one score forever. Giveall **overwrites the onboarding baseline with observed behavior**, and tells the user when it happens — that transparency is the trust mechanic.

Trigger: when a Curiosity Card response or a logged action contradicts the onboarding Love Language result (e.g., user picked "Acts" in onboarding but consistently rates Words-based check-ins highest in daily feedback for 5+ consecutive days).

Copy pattern:

> "We learned you feel more loved by Words than you thought. Adjusting your plan."

Implementation note: recalibration should never silently change `loveLanguage` — always surface the message above the same day it changes, and log the change in an (invisible-to-user) audit trail for debugging/support.

**Implementation status**: the nightly job (`functions/src/recalculateWeights.ts`) that reads `action_logs` and EMA-blends `loveLanguageWeights` is written but not deployed (Blaze deferred, see `docs/06-firebase-provisioning.md`). A client-side equivalent now runs live instead: `src/engine/recalibration.ts`'s `checkRecalibration` (pure, unit-tested) plus its `toDailyFeedback()` reducer (turns raw `action_logs` rows into one-per-day signal, counting only days where the action landed — `partnerMoodDelta > 0`) are wired into `app/checkin.tsx`. After a "Did this land?" reaction is logged, the last 14 days of `action_logs` are checked; on a 5-day consistent contradiction of `profiles.loveLanguageReceive`, the screen surfaces the exact "We learned you feel more loved by X..." copy from this doc, updates `loveLanguageReceive`, and appends an append-only `recalibration_events` doc (`type: 'client_recalibrated'`) — never a silent change, per the rule above. `firestore.rules` gained a matching `recalibration_events` rule (create + read own, no update/delete) and has been deployed. Verified live end-to-end against `giveall-app`: seeded 4 prior days of contradicting `words` signal via the Admin SDK, then a real 5th check-in click flipped `loveLanguageReceive` from `quality_time` to `words`, showed the message on-screen, and wrote the audit doc — all confirmed read back via the Admin SDK, then cleaned up. The nightly EMA-weighted job remains undeployed and untouched; this is a simpler, independent client-side path to the same product promise.

## 4. Bid Tracker logic (Gottman)

User logs a bid for connection made by their partner:

> "Partner made a joke while I was on phone"

App asks: **"Did you turn toward, away, or against?"**

- **Toward** = laughed, engaged
- **Away** = ignored, minimal response
- **Against** = annoyed, snapped

Compute **weekly toward-ratio** = `towardCount / totalCount`.

- If ratio ≥ 80%: show badge — "Bid Response: 85% — that's Secure Zone!"
- If ratio < 80%: trigger a Curiosity Card + an Appreciation quest (see `03-power-ups.md`) aimed at rebuilding toward-responses.

Gottman's own research uses 86%/33% as the masters/disasters split for married couples — 80% is a deliberately friendlier, easier-to-hit threshold for a consumer app; treat it as tunable, not gospel.

## 5. Curiosity Cards ladder

Never front-load deep/trauma questions. Cards are gated by `weeksSinceStart`:

| Weeks | Theme | Example |
|---|---|---|
| 1–4 | Gratitude / Joy | "What moment made you proud of us this week?" |
| 5–12 | Values / Dreams | "What's a hidden dream you've never told me?" |
| 12+ | Vulnerability / Repair | "When do you feel most alone, even when I'm here?" |

Within a tier, cards are served in a fixed or shuffled order (implementation choice), but **never jump tiers early** even if engagement is high — the ladder is a safety mechanism, not just a content schedule.
