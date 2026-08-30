# Internationalization

GiveAll supports 7 languages: English (default), Spanish, French, German, Portuguese, Chinese (Simplified), and Japanese. English is always the fallback — a user never sees a broken/empty string, they see the English original if a key is somehow missing.

## How it works

- **`i18next` + `react-i18next` + `expo-localization`** (`src/i18n/index.ts`). On first launch, the active language is the device's OS locale if it's one of the 7 supported languages, else English. Once a user picks a language in Settings, that choice is persisted (`AsyncStorage`, key `giveall_language_override`) and wins over device locale on every future launch.
- **`app/settings.tsx`** has the language switcher — a native-name chip row (`Español`, `Français`, `日本語`, etc., not English names, so a user can find their language without reading English first).
- **`app/_layout.tsx`** awaits `initI18n()` before rendering anything (same gating pattern as font loading) — no screen ever renders with i18next not yet initialized.
- **Translation files**: `src/i18n/locales/{en,es,fr,de,pt,zh,ja}.json`, one flat-ish namespaced JSON tree per language, keyed by screen (`checkin.*`, `bids.*`, etc.). `en.json` is the source of truth — every other file must have exactly the same key set (see "Keeping locales in sync" below).

## The engine stays framework-agnostic — it returns keys, not text

`src/engine/` has no i18n (or any framework) dependency by design (see main README). Anywhere the engine used to build a display string directly, it now returns an i18next **key** (+ interpolation params) instead, and the caller — always a React component, which can use `useTranslation()` — resolves it:

- `src/engine/decisionMatrix.ts`'s `MicroAttunement` has `strategyKey`/`actionKey`/`actionParams` instead of `strategy`/`tone`/`action` strings. `app/checkin.tsx` resolves them via `t(\`checkin.strategy.${strategyKey}\`)` / `t(\`checkin.action.${actionKey}\`, actionParams)`.
- `src/engine/retentionNotifications.ts`'s `buildRetentionNotification()` returns `{ key, params }`. Its caller, `src/notifications/checkinReminder.ts`, isn't a React component (a local push notification body isn't rendered through a component tree), so it resolves the key via i18next's own `i18n.t()` (the default export of `src/i18n/index.ts`) instead of the `useTranslation()` hook — same i18next singleton either way.
- `src/engine/recalibration.ts`'s `checkRecalibration()` no longer builds a `message` string at all; the caller (`app/checkin.tsx`) builds the user-facing message via `t('recalibration.message', { language: t(\`loveLanguages.${newPrimary}\`) })`, and separately writes a plain-English string to the `recalibration_events` audit trail (intentionally not translated — that's an internal/founder-facing record, not user-facing copy; see below).

## Content-managed Firestore catalogs are English-only for now

`suggested_actions` and `curiosity_cards` (the Firestore-backed content catalogs — see `docs/04-firebase-schema.md`) hold English-only `copy`/`question` text. Translating them would mean either maintaining 7 parallel catalog documents per entry or a translation layer neither exists yet. Rather than showing a half-English, half-translated card, `app/checkin.tsx` and `app/curiosity.tsx` both apply the same rule: **only prefer the Firestore catalog's text when the app's active language is English** (`i18n.language === 'en'`); every other language always uses the corresponding translated string from `src/i18n/locales/*.json`, which duplicates the same content by hand (same tradeoff `decisionMatrix.ts`'s hardcoded copy already made pre-i18n — see that file's comments). If the catalogs are ever translated, this is the gate to remove.

## What's intentionally still English-only

- **The Appreciation Generator's LLM prompt** (`src/engine/appreciationGenerator.ts`'s system prompt, and the Cloud Function/Ollama calls that use it) is English-only. A generated appreciation line will come back in English regardless of the app's active language — translating LLM prompt engineering is a deeper task than static UI copy and is out of scope for this pass. The **fallback** line shown before/if generation fails (`payoff.firstWinFallback`) is fully translated per language, so only the *live-generated* text (when it succeeds) is the gap.
- **`recalibration_events`'s audit `message` field** and the dashboard (`dashboard/public/index.html`) stay English — both are founder/internal-facing, not shown to end users.
- **`marketing/public/index.html`** (the public landing page) is English-only — it's a separate static site outside the Expo app's i18n setup; translating it would need its own follow-up pass (a per-language route or a language switcher on that page).

## Keeping locales in sync

There's no automated CI check for this yet — when adding a new user-facing string, add the key to **all 7** `src/i18n/locales/*.json` files, not just `en.json`. To audit for drift (missing keys, or a suspiciously-untranslated string that's identical to English), diff the flattened key sets — this caught one real gap during development (Spanish's `ritualTime.options` had "7pm"/"9pm" left untranslated instead of "19h"/"21h" — every other language got it right). A quick one-off Node script that recursively flattens each JSON file and compares keys/values against `en.json` is enough; there wasn't a reusable audit script kept in the repo for this, but the pattern is: flatten to dot-paths, diff key sets for missing/extra, flag same-language-as-English values longer than a couple of characters for manual review (short loanwords like "photo" or "Status" being identical across languages is expected, not a bug).

## Quality note

The 6 non-English translations were produced by Claude (this session), not reviewed by native speakers. They're professional-quality machine/AI translation, not a substitute for a native-speaker pass before a real launch — particularly given how much of this copy is emotionally sensitive (attachment style, relationship conflict, vulnerability). Treat them as a strong, functional starting point, not final ship-ready copy.

## Not yet supported

- **RTL languages** (Arabic, Hebrew, etc.) — not in the 7 supported languages for this pass, specifically to avoid shipping a half-implemented RTL layout (React Native's `I18nManager` RTL support needs real layout testing per screen, which this pass didn't do). Adding one is a distinct follow-up, not just another locale JSON file.
- **Native app builds** (`eas.json`) don't yet bundle per-platform language metadata (e.g. iOS's `CFBundleLocalizations` / Android's supported-locales config) — the app's language switching works at the JS layer regardless, but neither app store listing will show "available in 7 languages" without that metadata added separately.
