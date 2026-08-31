# Store Submission Prep

Everything below is ready to paste into App Store Connect / Google Play Console the moment those accounts exist. This doc doesn't submit anything — neither store account exists yet — it just makes actual submission a copy-paste job instead of a from-scratch writing exercise.

## Hard blockers (need real accounts/decisions, not more prep)

- **Apple Developer Program account** ($99/yr) — required for App Store Connect access and any real-device iOS build (the current EAS `preview` build is simulator-only).
- **Google Play Console account** ($25 one-time) — required for any Play Store listing.
- **Redeploy the marketing site.** The support contact in `marketing/public/privacy.html` is now `info@giveall.app` (both stores require a working support email before approval). Run `firebase deploy --only hosting:marketing` so the live page at `https://giveall-love.web.app/privacy` reflects it before submitting either listing. Make sure `info@giveall.app` is actually monitored.
- **EAS account decision** — builds currently run under `kodjoefamily@gmail.com` on Expo's servers, a different account than the one that owns the `giveall-app` Firebase project. Not itself a submission blocker (EAS and the store accounts are independent), but worth resolving so the same person can manage builds and store listings without asking someone else to approve things.

## Already live and usable

- **Privacy Policy URL**: `https://giveall-love.web.app/privacy` — both stores require this at submission time. Real page; contact address is `info@giveall.app` (redeploy the marketing site to publish — see above).
- **Support contact**: `info@giveall.app` — use this for App Store Connect's "Support URL"/contact and Play Console's "Email address" fields.
- **App icon**: `assets/images/icon.png` (1024×1024, no alpha — meets Apple's "no transparency" requirement directly) and `assets/images/adaptive-icon.png` (Android adaptive icon foreground) are both already wired into `app.json` and match the current brand color.
- **Bundle identifiers**: `com.giveall.app` for both platforms (`app.json`'s `ios.bundleIdentifier` / `android.package`).

## Store listing copy

### App name
**GiveAll** (both stores, well under the 30-character limit either enforces)

### iOS subtitle (30 char max)
**Daily Relationship Fitness** (26 chars)

### Google Play short description (80 char max)
**90 seconds a day to feel more loved — and make someone feel loved too.** (70 chars)

### Keywords (iOS keyword field, 100 char max, comma-separated)
`relationship,love language,attachment style,couples,gottman,daily habit,intimacy,connection` (91 chars)

### Full description (both stores; well under Apple's/Google's 4000-char limit)

> **Love is a daily practice.**
>
> GiveAll is a 90-second daily fitness app for your relationship. It reads your Attachment style and Love Language, then prescribes one small, specific action a day — never a generic reminder, always something tailored to how you actually connect.
>
> **What makes it different:**
>
> — **Micro-Attunement.** Every day, one small action: a voice note, a recalled detail, a chosen moment. Whatever moves the needle for you today, not a one-size-fits-all tip.
>
> — **Memory Vault + Desire Inventory.** Log the small things your partner mentions in passing. GiveAll brings them back at the right moment — being remembered is how people feel seen.
>
> — **Bid Tracker.** Every small bid for connection — a comment, a touch, a joke — logged and turned toward, so your response ratio becomes something you can actually see improve.
>
> — **Dynamic Recalibration.** Static quizzes give you one score forever. GiveAll updates what it knows about you from your actual behavior, and always tells you when it happens.
>
> **Private by design.** This is your private sanctuary. No data is ever sold. Partner Mode requires explicit double opt-in from both people — neither of you can unilaterally see the other's data. You can delete your Memory Vault anytime. No account, email, or phone number required to use the app.
>
> Give All of your love, daily. Generous, warm, abundant.

## Screenshots

`store-assets/screenshots/{ios-6.7,android}/01-hero.png` through `04-todays-action.png` — 8 screenshots total, ready to upload. Real product UI (onboarding hero, the "First Win" appreciation moment, daily check-in, today's prescribed action), not mockups. Generated via Playwright at the exact required pixel dimensions:

- **iOS 6.7"** (iPhone 15/16 Pro Max class): 1290×2796 — Apple's current baseline screenshot requirement.
- **Android**: 1080×2400 — a common modern flagship resolution, well within Play's accepted range.

Getting these right took two failed attempts worth knowing about if regenerating: (1) setting the Playwright viewport directly to the target pixel dimensions makes the responsive web layout reflow like a desktop page — huge empty space below top-anchored content, not what a phone screen looks like. Fixed by using a real phone-width (390px) viewport matching the target aspect ratio, then letting `deviceScaleFactor` upscale to the exact required output pixels. (2) The first clean-looking batch had Metro's dev-client "Refreshing... Don't see your changes?" overlay baked into one screenshot — dev-server chrome that must never ship. Fixed by explicitly waiting for that text to be absent before every screenshot, not just assuming a fixed delay was enough.

**Caveat**: these come from the web build via the local Expo dev server, not a real device build — a reasonable stand-in given the UI is identical across targets, but worth a final visual pass on an actual device once the Apple Developer / Google Play accounts exist, since native rendering (fonts, safe-area insets, status bar) can differ subtly from the web target these were captured on.

## Age rating

Both stores' content questionnaires ask about romantic/relationship and mild intimacy themes (the app discusses attachment style, love languages, and a "Desire Inventory" concept). Draft answers below — checked against what the app actually does — for whoever holds the account to confirm and submit; the final call is theirs, but these shouldn't need changing.

**Apple App Store (App Store Connect → Age Rating questionnaire):**

| Question | Answer | Why |
| --- | --- | --- |
| Cartoon or Fantasy Violence | None | — |
| Realistic Violence | None | — |
| Sexual Content or Nudity | None | The "Desire Inventory" is about non-sexual acts of connection (a recalled detail, a chosen moment); no sexual descriptions, imagery, or explicit prompts anywhere. |
| Profanity or Crude Humor | None | — |
| Alcohol, Tobacco, or Drug Use | None | — |
| Mature/Suggestive Themes | **Infrequent/Mild** | The app frames itself around romantic relationships and intimacy-of-connection; nothing graphic, but not a children's topic. |
| Horror/Fear, Gambling, Contests | None | — |
| Unrestricted Web Access | No | No in-app browser; the only outbound link is the privacy policy. |
| Medical/Treatment Information | No | It's explicitly framed as "relationship fitness," not therapy or medical advice. |

Expected result: **12+**.

**Google Play (Play Console → Content rating questionnaire, IARC):**

- Category: **Reference, News, or Educational** (or "Social Networking" only if Partner Mode is considered social — it's a private 1:1 double-opt-in link with no feed, no discovery, no messaging, so Reference/Educational is the better fit).
- Violence / Sexuality / Language / Controlled substances: **No** to all.
- "Does the app contain any content that could be considered sexually suggestive or refer to sexual activity?" → **No** (see the Apple note above — connection acts, not sexual content).
- User-generated content shared with other users: **Yes, limited** — Memory Vault / Desire Inventory notes are visible to a linked partner after mutual opt-in. Not publicly broadcast. Declare it; it does not by itself raise the rating.
- Data collection: point to `https://giveall-love.web.app/privacy`.

Expected result: **Teen** (or **Everyone 10+** depending on how the suggestive-themes question is weighted — either is acceptable; don't overstate to Mature).

## Category

Suggested: **Health & Fitness** (both stores have this category, and "relationship fitness" is the app's own framing) with **Lifestyle** as a plausible secondary/alternate if a reviewer pushes back.
