# GiveAll Design Tokens

App name: **GiveAll** — "Give All of your love, daily. Generous, warm, abundant." This replaced the placeholder dark theme used in early scaffolding; see `src/theme/tokens.ts` for the TypeScript source of truth (keep both in sync if either changes).

## Colors

| Token | Value | Use |
|---|---|---|
| `primary` | `#B34B40` | CTAs, progress bar fill, selected states. Darkened from `#FF6B5B` — the original coral was only 2.66-2.80:1 against `background`/`surface`, failing WCAG AA both as button-background-under-white-text and as the ~15 inline link/kicker text uses across the app (both need 4.5:1). This shade clears 4.75:1+ in every role — see `src/theme/tokens.ts` |
| `primaryLight` | `#FF8E7A` | |
| `primaryDark` | `#E85A4A` | |
| `secondary` | `#FFC857` | |
| `secondaryLight` | `#FFD97A` | |
| `background` | `#FFF8F0` | Screen background |
| `surface` | `#FFFFFF` | Cards, option rows |
| `surfaceAlt` | `#FFF1E6` | Appreciation card background |
| `textPrimary` | `#2D2A26` | |
| `textSecondary` | `#776B65` | Darkened from `#8C7E77` for WCAG AA text contrast — see `src/theme/tokens.ts` |
| `textInverse` | `#FFFFFF` | Text on `primary`-colored surfaces |
| `success` | `#A8D8B9` | |
| `warning` | `#FFC857` | |
| `error` | `#B34B40` | Unused elsewhere; kept equal to `primary` |
| `border` / `blush` | `#FFE4E1` | Card borders |
| `sage` | `#A8D8B9` | |

## Typography

Font family: **Inter** (loaded via `@expo-google-fonts/inter` in `app/_layout.tsx`; falls back to system font until loaded — the root layout renders `null` until `useFonts` resolves).

| Style | Size | Weight | Line height |
|---|---|---|---|
| heading1 | 32 | 800 (ExtraBold) | 36 |
| heading2 | 22 | 700 (Bold) | 28 |
| body | 16 | 400 (Regular) | 24 |
| caption | 12 | 600 (SemiBold), letter-spacing 0.8 | — |

## Spacing & radius

| Token | Value |
|---|---|
| `spacing.xs/sm/md/lg/xl` | 4 / 8 / 16 / 24 / 32 |
| `radius.sm/md/lg/full` | 12 / 16 / 24 / 9999 |
| Button | 52px height, `radius.md` (16px), `colors.primary` |
| Card | `radius.lg` (24px), soft shadow `0 8px 24px rgba(45,42,38,0.06)` |

## Where it's applied

All 6 onboarding screens (`app/index.tsx` through `app/ritual-time.tsx`) and both shared components (`src/components/OptionCard.tsx`, `ProgressBar.tsx`) now use `src/theme/tokens.ts` instead of hardcoded hex values. `app.json`'s splash screen and `userInterfaceStyle` were updated to match — the app is locked to light mode since there's no dark variant of this palette yet.
