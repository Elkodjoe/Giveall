# Onboarding Flow — The First 90 Seconds

**Goal:** make the user feel *seen* in 90 seconds, not interrogated. If onboarding feels like therapy intake, they churn. Every screen before the permission ask must deliver value first.

**Design rule:** progress bar visible from Screen 3 onward. Soft haptic on every tap (RN: `expo-haptics`, `ImpactFeedbackStyle.Light`). No screen should require typing except optional free text on Screen 5's save/send.

---

## Screen 1 — The Promise (3 sec)

- **Headline:** "Love is a daily practice."
- **Sub:** "90 seconds a day to feel more Attractive, Valued, and Wanted."
- **CTA:** "Start My Assessment"
- **Why:** Sets the frame — this is fitness, not a trick or a test to fail.

## Screen 2 — Who Are You Here For? (1 tap)

Single-select, full-bleed tappable cards:

- Got a crush I want to be closer to
- Dating someone new (0–6 months)
- In a long-term relationship
- Healing / becoming magnetic for next love

**This branches the entire algorithm — sets `mode`.** Do not skip or make skippable. "Individual-first mode" (no partner account required) starts here regardless of answer.

## Screen 3 — Attachment Snapshot (6 questions, not 36)

Scenario-based, never self-report labels ("Are you anxious?" is banned). Example:

> "When they don't text back for hours, you…"
> A) Assume they're busy, check later → **Secure**
> B) Spiral and want to double-text → **Anxious**
> C) Feel relieved, need space → **Avoidant**
> D) Want closeness but fear bothering them → **Fearful**

6 questions total, each option pre-mapped to one of the 4 styles. Tally → highest-count style wins; ties resolve toward whichever style has the higher-weighted (see engine) questions, or present as "X-leaning with Y spikes" (see Screen 5 payoff copy).

Show progress bar + soft haptic on tap.

## Screen 4 — Love Language Forced Choice (4 taps)

Not ranking — **forced choice pairs**, which produces cleaner signal than a ranked list:

> "Which would make you feel MORE loved after a hard day?"
> - "I handled that errand for you" (**Acts of Service**)
> - "You mean so much to me, I'm proud of you" (**Words of Affirmation**)

4 pairs, rotating through the 5 languages (Words, Acts, Gifts, Quality Time, Touch), tallied to a primary + secondary language.

## Screen 5 — The Payoff Preview (the Aha Moment)

**Critical screen — do not ask for notification permission before this.** Show the user you already understand them:

> "Got it. You're Secure-leaning with Anxious spikes, and you feel most loved through Words, but you SHOW love through Acts. That's why you feel unseen sometimes. Here's your first micro-adjustment…"

Then instantly generate **Your First Win** using the Appreciation Generator (see `03-power-ups.md`):

> **Your First Win: Your Unsolicited Appreciation**
> "I love how you think out loud when you're solving something — you don't hide the messy part."

- **CTA:** "Save it" or "Send it" — instant value delivered before any ask is made.

## Screen 6 — Soft Permission + Ritual Time

> "When should we do your 90-sec check-in? Most people pick after dinner."
> [7pm] [9pm] [Custom]

Selecting a time **triggers the iOS notification permission prompt immediately after**, not before. By this point the user has already received value twice (the payoff card + the ritual-time choice itself feels like a plan, not a request).

**Result:** permission is asked for last, after value has already been delivered twice. This ordering is load-bearing for conversion — do not reorder in implementation.
