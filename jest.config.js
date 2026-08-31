module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // firestore.rules.test.ts needs a running Firestore emulator — excluded
  // from the default run, see `npm run test:rules` / jest.rules.config.js.
  // functions/ is its own package (separate node_modules, own jest.config.js,
  // its tests need the emulator too) — without excluding it here, the root
  // `npx jest` crawls into it directly and fails to resolve
  // firebase-functions/firebase-admin from the wrong node_modules.
  testPathIgnorePatterns: ['/node_modules/', 'firestore.rules.test.ts', '<rootDir>/functions/'],
};
