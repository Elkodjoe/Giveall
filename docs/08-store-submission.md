# Store Submission Prep

Everything below is ready to paste into App Store Connect / Google Play Console the moment those accounts exist. This doc doesn't submit anything — neither store account exists yet — it just makes actual submission a copy-paste job instead of a from-scratch writing exercise.

## Hard blockers (need real accounts/decisions, not more prep)

- **Apple Developer Program account** ($99/yr) — required for App Store Connect access and any real-device iOS build (the current EAS `preview` build is simulator-only).
- **Google Play Console account** ($25 one-time) — required for any Play Store listing.
- **A real, monitored support contact.** `marketing/public/privacy.html` has a placeholder email (`privacy@giveall.app`) clearly marked as a placeholder in the visible page text — both stores require a working support URL or email before they'll approve a listing. Replace it and redeploy (`firebase deploy --only hosting:marketing`) before submitting either listing.
- **EAS account decision** — builds currently run under `kodjoefamily@gmail.com` on Expo's servers, a different account than the one that owns the `giveall-app` Firebase project. Not itself a submission blocker (EAS and the store accounts are independent), but worth resolving so the same person can manage builds and store listings without asking someone else to approve things.

## Already live and usable

- **Privacy Policy URL**: `https://giveall-love.web.app/privacy` — both stores require this at submission time. Real page, not a placeholder (only the contact address inside it is).
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

Not yet produced. App Store and Play Store both require device-specific screenshot sizes (iOS: 6.7" and 6.5" displays at minimum; Android: phone + optional tablet). The Playwright screenshots already taken during this project's accessibility/contrast verification passes (390×844 viewport) are a reasonable starting composition to reshoot at the exact required dimensions once real device builds exist — worth doing after a real-device iOS build (needs the Apple Developer account above) rather than from the simulator build, so the screenshots reflect what a reviewer/user will actually see.

## Age rating

Not yet filled out — both stores' content questionnaires ask about romantic/relationship and mild intimacy themes (the app discusses attachment style, love languages, and a "Desire Inventory" concept). Worth a deliberate answer rather than a default guess; likely lands at Apple's 12+ or Google's Teen tier given no explicit content, but this is a content-policy judgment call for whoever holds the account, not something to pre-fill here.

## Category

Suggested: **Health & Fitness** (both stores have this category, and "relationship fitness" is the app's own framing) with **Lifestyle** as a plausible secondary/alternate if a reviewer pushes back.
