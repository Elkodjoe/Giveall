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

**Provider wiring**: `functions/src/generateAppreciation.ts` is a Cloud Function that calls this prompt builder and supports **both** Anthropic and OpenAI — only one needs a real API key configured. It tries a primary provider (Anthropic by default, see `PRIMARY_PROVIDER` in that file) and falls back to the other if the primary's key is missing or its call fails, via the pure, unit-tested `orderAvailableProviders()` in `src/engine/llmProvider.ts`. The client calls it through `src/firebase/appreciationClient.ts`, used in `app/payoff.tsx`'s "First Win" moment — that screen always renders a static fallback line instantly (this is the Aha Moment, it must never wait on a network call) and silently swaps in the real generated line if the Cloud Function call succeeds; any failure (not deployed, no provider key, network error) just leaves the fallback in place, no error shown to the user.

Setting up the API keys: see `docs/06-firebase-provisioning.md`.

## 2. Retention that doesn't nag

Notification copy must reference a specific past win, never guilt about absence.

| Bad | Good |
|---|---|
| "You haven't checked in!" | "Your partner felt extra loved yesterday after your voice note. Keep momentum? 2-min check-in." |
| "Don't lose your streak!" | "Your Bid Response is at 85% this week — that's Secure Zone. One more check-in locks it in." |

Rule of thumb: every retention notification must contain either (a) a specific past result the user produced, or (b) a specific near-term payoff — never a bare reminder or streak-loss threat.

## 3. Privacy guardrail

Ship this copy in Settings from day one, unedited by growth/marketing pressure:

> "This is your private sanctuary. No data is ever sold. Partner mode requires explicit double opt-in. You can delete your Memory Vault anytime."

Trust is the retention mechanic for this category — this copy is not decorative, treat changes to it as a product decision, not a copy tweak.
