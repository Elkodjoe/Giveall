# Firebase Provisioning — Manual Steps

## Status: mostly deployed

Project `giveall-app` is live under `emmakodjoe1@gmail.com`. Done: project created, Firestore database created (region `nam5`), security rules + indexes deployed, Anonymous Auth enabled, seed data loaded (`suggested_actions`, `curiosity_cards`), a web app registered and its config copied into `.env`. Verified end-to-end against the real project (browser-driven test through onboarding → check-in → bids → curiosity cards, confirmed real Firestore writes, then cleaned up).

**Not deployed: Cloud Functions** (`nightlyRecalculateWeights`, `activatePartnership`, `validateProfile`). These require the Blaze (pay-as-you-go) plan, which needs a payment method on file — skipped for now by choice. The app works fully without them; they're background maintenance (nightly recalibration, server-side validation), not something the running app depends on synchronously. To deploy later:

```
cd functions && npm install && cd ..
firebase deploy --only functions --project=giveall-app
```

(after upgrading to Blaze at https://console.firebase.google.com/project/giveall-app/usage/details)

## Steps, for reference / re-provisioning elsewhere

### 1. Create the project

```
npm install -g firebase-tools
firebase login
firebase projects:create giveall-app --display-name="GiveAll"
firebase use giveall-app
```

`firebase login` needs an interactive browser sign-in. On a machine without a browser available to the CLI, it falls back to a device-code flow: it prints a URL + session ID, you open the URL on any device, sign in, and get back a code to complete with `firebase login <code>`.

**Watch for the wrong Google account being active in your browser** — if you're signed into multiple Google accounts, actions can silently apply to the wrong one and fail with confusing permission errors. Check the account switcher (top-right avatar) in any Google/Firebase console page matches the account you ran `firebase login` as.

### 2. Enable services

- **Authentication** → Sign-in method → enable **Anonymous** (the app signs in anonymously by default — see `src/firebase/auth.ts`). No CLI command for this; console only. Enabling can take a minute or two to actually propagate — a `signInAnonymously()` call made immediately after can fail with `auth/admin-restricted-operation` even though the console shows "Enabled"; just retry after a short wait.
- **Firestore** → create the database via CLI:
  ```
  firebase firestore:databases:create "(default)" --location=nam5 --project=giveall-app
  ```
  This requires the Cloud Firestore API to be enabled first — the command's error message links directly to the enable page if it isn't.
- **Functions** → requires the Blaze plan (see above) — `nightlyRecalculateWeights` is a scheduled function, unsupported on the free Spark plan.

### 3. Deploy rules, indexes, and seed data

```
firebase deploy --only firestore:rules,firestore:indexes --project=giveall-app
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json npm run seed
```

Get a service account key: Project Settings → Service Accounts → **Generate new private key**. **Never commit this file** — `.gitignore` covers `*firebase-adminsdk*.json` and a stray `.json/` directory (a browser "save as" dialog can create a literal folder named `.json` if you paste a bare directory path into the filename field — watch for that).

Verify what landed with:
```
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json npm run check-firestore
```

### 4. Client config

```
firebase apps:create WEB "GiveAll" --project=giveall-app
firebase apps:sdkconfig WEB <appId> --project=giveall-app
```

Copy the printed `apiKey`/`authDomain`/etc. into `.env` (see `.env.example` for the variable names). On Windows, the CLI may print a harmless `Assertion failed... uv_handle_t` crash *after* printing the config — the data is still valid, ignore it.

## Real bug found and fixed during first deployment

`firestore.rules` originally used `resource.data.userId` to gate both reads *and writes* on `daily_checkins`, `action_logs`, `bids`, `memory_vault`, and `curiosity_card_progress`. This looks reasonable but is wrong for **create**: `resource` is the document's state *before* the write, which doesn't exist yet on create, so `resource.data.userId` is always null and every new-document write was silently denied ("Missing or insufficient permissions") — confirmed live, not theoretical. Fixed by splitting each into a `create` rule (checks `request.resource.data.userId`, the incoming write) and a separate `read, update, delete` rule (checks `resource.data.userId`, the existing doc). Verified fixed by re-running the same end-to-end browser test and confirming real writes landed in each collection.

## Not yet needed

No third-party API keys required for v1. If the Appreciation Generator (`src/engine/appreciationGenerator.ts`) gets wired to an actual LLM provider later, that provider's API key would be added as a Cloud Functions secret (`firebase functions:secrets:set`), not a client-side env var — the prompt-building logic is already provider-agnostic.
