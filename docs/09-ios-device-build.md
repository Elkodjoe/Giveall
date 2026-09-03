# iOS device build (EAS)

The `preview` EAS profile builds an iOS **simulator** app — no Apple account
needed, but it can't run on a physical iPhone and isn't worth taking
screenshots from (fonts, safe-area insets, and the status bar render
differently than a real device). The `device` profile below produces a
real, installable iOS build.

## You do NOT need a Mac

EAS Build compiles iOS apps on Apple hardware in Expo's cloud. You trigger
the build from Windows (CLI) or from the expo.dev website; the `.ipa` comes
back with an install link. A local Mac is never required — for building or
for `eas submit`. The only hard requirement is an **Apple Developer Program
membership** ($99/yr) so Apple will issue signing credentials.

### Trigger it from the website (no CLI)

1. Enrol in the Apple Developer Program: <https://developer.apple.com/programs/>
2. At <https://expo.dev> open the `giveall` project → **GitHub** → connect
   the `Elkodjoe/Giveall` repository.
3. → **Workflows** → run **iOS device build** (`.eas/workflows/ios-device-build.yml`),
   or just push to `main`.
4. The first run pauses once for an Apple ID sign-in so EAS can create and
   store the Distribution certificate + provisioning profile. After that
   every run is unattended.
5. Register each test iPhone under → **Devices** (or `eas device:create`)
   so the ad-hoc profile includes it, then open the build's QR link on
   that phone to install.

The CLI path below does the exact same thing from your machine.

## What it needs

- **An Apple Developer Program membership** ($99/yr). Required for code
  signing — there is no way around this for a device build. Enrol at
  <https://developer.apple.com/programs/>.
- **`eas-cli`** logged in to the Expo account that owns the project
  (`owner: "elkodjoe1"` in `app.json`). `npm i -g eas-cli`, then
  `eas login`.
- **Registered test devices.** For `distribution: internal`, each iPhone
  that will install the build must be in the provisioning profile. Add
  them with `eas device:create` (sends a registration link to open on the
  phone), or let the interactive `eas build` prompt walk you through it
  the first time.

## Build

```sh
cd E:\Giveall
eas login                       # the elkodjoe1 account
eas device:create               # register your iPhone(s) — one-time, repeat per device
eas build --platform ios --profile device
```

The first run asks to sign in with your **Apple ID** and then lets EAS
generate and manage the signing credentials (Distribution certificate +
ad-hoc provisioning profile) on Apple's side — say yes; it's far less
error-prone than managing them by hand. Credentials are cached on EAS for
later builds.

When it finishes, EAS prints a URL with a QR code. Open it on a
**registered** iPhone to install (the device must already be in the
profile, or the install silently fails with "unable to install").

## App Store build (later)

```sh
eas build --platform ios --profile production
eas submit --platform ios --latest
```

`production` uses `autoIncrement` for the build number and a store
distribution profile. `eas submit` uploads the `.ipa` to App Store Connect
— which needs the app record created there first (name, bundle id
`com.giveall.app`, the metadata from `docs/08-store-submission.md`).

## Config already in place

- `app.json` → `ios.bundleIdentifier` = `com.giveall.app`, tablet support
  off, `ITSAppUsesNonExemptEncryption: false` (skips the export-compliance
  prompt), the 7 `CFBundleLocalizations`, and `remote-notification`
  background mode.
- `app.json` → `plugins`: `expo-av` (with `microphonePermission: false` —
  the app only plays audio, so no mic permission string is added and no
  App Store privacy question is triggered) and `expo-notifications` (local
  reminders only; no push server, no APNs key needed).
- `eas.json` → `device` profile: `ios.simulator: false`,
  `distribution: internal`. The Android side of the same profile still
  builds an installable APK.

## Environment variables

EAS builds don't read your local `.env`. The `EXPO_PUBLIC_*` values the app
needs at runtime (Firebase config, `EXPO_PUBLIC_APPRECIATION_PROXY_URL`)
must be set as EAS environment variables:

```sh
eas env:create --environment production --name EXPO_PUBLIC_APPRECIATION_PROXY_URL --value https://giveall-appreciation-proxy.giveall.workers.dev
# ...repeat for each EXPO_PUBLIC_FIREBASE_* value from .env
```

or add them under Project settings → Environment variables in the Expo
dashboard. Without them the build falls back to the anonymous-only,
static-appreciation path (it still runs, just without Firebase or live
generation).
