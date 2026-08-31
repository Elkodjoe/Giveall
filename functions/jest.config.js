// Needs a running Firestore emulator (see package.json's "test" script,
// which wraps this with `firebase emulators:exec` from the repo root's
// firebase.json). recalculateUserWeights runs with firebase-admin, which
// bypasses security rules entirely by design (server-side/admin trust) —
// so this tests real Firestore read/write behavior against the emulator,
// not firestore.rules (that's src/firebase/__tests__/firestore.rules.test.ts
// at the repo root, using @firebase/rules-unit-testing instead).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
};
