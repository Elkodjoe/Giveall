# Power-Ups

## 1. Appreciation Generator (AI prompt)

Never allow generic output like "You're amazing." Force the formula: **Specific Observation + Effect on You.**

**System prompt (for the LLM call):**

```
You turn a generic compliment into one specific, personal moment.
Rules:
- Never use generic adjectives alone ("amazing", "great", "perfect") without a concrete observation attached.
- Output must name a specific behavior, habit, or moment — something only someone who actually knows this person would notice.
- Output must state the effect it has on the speaker ("it makes me feel...", "it reminds me...").
- Keep it to one or two sentences. No greeting, no sign-off, just the line itself.
- Match the tone to the user's dominant love language when provided.

Input: a generic compliment, optionally with context (love language, a Memory Vault detail, a recent Curiosity Card answer).
Output: one specific, personal line ready to send as-is.
```

**Example:**
- Input: "You are funny."
- Output: "I love how you do that deadpan voice when you're nervous — it makes me feel like we're on the same team."

Implementation: `src/engine/appreciationGenerator.ts` exposes `buildAppreciationPrompt(input)` which assembles the system prompt + user context into a ready-to-send LLM request payload — kept provider-agnostic on purpose.

**Provider wiring**: `functions/src/generateAppreciation.ts` is a Cloud Function that calls this prompt builder and supports **both** Anthropic and OpenAI — only one needs a real API key configured. It tries a primary provider (Anthropic by default, see `PRIMARY_PROVIDER` in that file) and falls back to the other if the primary's key is missing or its call fails, via the pure, unit-tested `orderAvailableProviders()` in `src/engine/llmProvider.ts`. The client calls it through `src/firebase/appreciationClient.ts`.

**Local dev fallback (Ollama)**: Cloud Functions need the Blaze billing plan, which is deliberately deferred (see `docs/06-firebase-provisioning.md`). `src/llm/ollamaClient.ts` calls a locally running Ollama server (`ollama serve`) directly from the client — bypassing Cloud Functions entirely, since a deployed function has no network route to a developer's own machine — so the generator can be tested live for free, no billing or API key required. `app/payoff.tsx`'s "First Win" moment tries, in order: the Cloud Function, then Ollama, then a static fallback line — always rendering the fallback instantly first (this is the Aha Moment, it must never wait on a network call) and silently swapping in whichever live source succeeds. Verified working end-to-end with a real local model (`llama3.2:3b`).

Setting up the Anthropic/OpenAI API keys: see `docs/06-firebase-provisioning.md`. Ollama config (`EXPO_PUBLIC_OLLAMA_BASE_URL`, `EXPO_PUBLIC_OLLAMA_MODEL`) is in `.env.example`, both optional with sensible defaults.

## 2. Retention that doesn't nag

Notification copy must reference a specific past win, never guilt about absence.

| Bad | Good |
|---|---|
| "You haven't checked in!" | "Your partner felt extra loved yesterday after your voice note. Keep momentum? 2-min check-in." |
| "Don't lose your streak!" | "Your Bid Response is at 85% this week — that's Secure Zone. One more check-in locks it in." |

Rule of thumb: every retention notification must contain either (a) a specific past result the user produced, or (b) a specific near-term payoff — never a bare reminder or streak-loss threat.

**Implementation**: `src/engine/retentionNotifications.ts` builds the copy (pure, unit-tested); `src/notifications/checkinReminder.ts` schedules it via `expo-notifications`, replacing any previously-scheduled reminder (single well-known identifier) rather than stacking duplicates. `src/notifications/nextOccurrence.ts` is the pure "next HH:mm from now" date math, extracted so it's testable without importing `expo-notifications`. Wired in two places: `app/ritual-time.tsx` schedules the first reminder right after the user picks a check-in time during onboarding; `app/checkin.tsx` reschedules tomorrow's reminder after every completed check-in, computing a real `bidResponseRatioPct` from the last 7 days of bids when any exist (falling back to the neutral "Ready for today's 90-second check-in?" line otherwise — no past-result claim is ever fabricated, e.g. there's no mechanism yet to know "how your partner felt", so that copy variant isn't used). No-ops non-fatally on platforms without local notification support (e.g. Expo web).

## 3. Privacy guardrail

Ship this copy in Settings from day one, unedited by growth/marketing pressure:

> "This is your private sanctuary. No data is ever sold. Partner mode requires explicit double opt-in. You can delete your Memory Vault anytime."

Trust is the retention mechanic for this category — this copy is not decorative, treat changes to it as a product decision, not a copy tweak.
