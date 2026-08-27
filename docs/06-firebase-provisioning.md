# Firebase Provisioning — Manual Steps

Nothing is deployed yet. `firebase login` and project creation require your Google account interactively, so these steps are for you to run — not something that can be automated from here.

## 1. Create the project

```
npm install -g firebase-tools
firebase login
firebase projects:create giveall-app --display-name="GiveAll"
firebase use giveall-app
```

(Or via console.firebase.google.com → Add project → `giveall-app`.)

## 2. Enable services (Firebase Console)

- **Authentication** → enable Anonymous (the app signs in anonymously by default — see `src/firebase/auth.ts`). Add Email/Password or another provider later if you build the upgrade-from-anonymous flow.
- **Firestore** → Create database → start in production mode (this repo's `firestore.rules` replaces the defaults, so test mode isn't needed).
- **Functions** → requires the Blaze (pay-as-you-go) plan — `nightlyRecalculateWeights` is a scheduled function, which Firebase doesn't support on the free Spark plan.

## 3. Init locally (from the repo root)

```
firebase init
```

- Select: **Firestore**, **Functions**
- Use existing project: `giveall-app`
- Firestore rules: point to `firestore.rules` (already exists — don't overwrite)
- Firestore indexes: point to `firestore.indexes.json` (already exists)
- Functions: TypeScript, existing `functions/` directory — don't let the CLI scaffold a new one

## 4. Deploy

```
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm install && cd ..
firebase deploy --only functions
```

## 5. Seed data

```
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json npm run seed
```

Get a service account key from Project Settings → Service Accounts → Generate new private key. See `scripts/seed/import-seed-data.ts`.

## 6. Client config

Copy `.env.example` to `.env` and fill in the Firebase web app config (Project Settings → General → Your apps → Web app → SDK setup and configuration).

## Not yet needed

No third-party API keys required for v1. If the Appreciation Generator (`src/engine/appreciationGenerator.ts`) gets wired to an actual LLM provider later, that provider's API key would be added as a Cloud Functions secret (`firebase functions:secrets:set`), not a client-side env var — the prompt-building logic is already provider-agnostic.
