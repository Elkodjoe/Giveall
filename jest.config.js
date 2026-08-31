module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // firestore.rules.test.ts needs a running Firestore emulator — excluded
  // from the default run, see `npm run test:rules` / jest.rules.config.js.
  testPathIgnorePatterns: ['/node_modules/', 'firestore.rules.test.ts'],
};
