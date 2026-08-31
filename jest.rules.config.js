// Separate config for firestore.rules.test.ts — needs a running Firestore
// emulator (see package.json's test:rules script, which wraps this with
// `firebase emulators:exec`), so it's excluded from the default jest.config.js
// run (which must work with no emulator, since that's what every other
// verification pass in this project relies on).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/firestore.rules.test.ts'],
  // Default 5000ms is too short for a cold Firestore emulator (JVM) startup
  // in beforeAll, which took 10-50s in practice — this isn't a slow test,
  // it's a slow one-time emulator boot.
  testTimeout: 60000,
};
