/**
 * Firestore security rules regression suite.
 *
 * Every scenario below is a real bug found this project's history by manual,
 * one-off adversarial testing against the live deployed rules (custom-token
 * sessions, not the Admin SDK, which bypasses rules entirely and can't catch
 * any of this) — see docs/04-firebase-schema.md for the original writeups.
 * This suite turns those into permanent regression tests against the local
 * Firestore emulator, so a future rules edit can't silently reintroduce them.
 *
 * Run via `npm run test:rules` (wraps this file with
 * `firebase emulators:exec`, which starts and tears down a real emulator) —
 * NOT part of the default `npm test` / `npx jest` run, since that would
 * require an emulator to already be running. See jest.rules.config.js.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'giveall-rules-test';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8085,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

const ALICE = 'alice-uid';
const BOB = 'bob-uid';
const MALLORY = 'mallory-uid';

// Sorted the same way partnershipId() in src/firebase/collections.ts does —
// deliberately duplicated here rather than imported, so this test can never
// pass by accident just because it reuses the same (possibly buggy) helper
// the app or the rules file uses.
function sortedPartnershipId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

describe('profiles: partner-read after double opt-in (bug #1 — unsorted lookup id)', () => {
  test('reader whose uid sorts AFTER the profile owner can still read once the partnership is active', async () => {
    // ALICE < BOB lexicographically is not guaranteed for arbitrary uids, so
    // pick uids that deliberately sort BOB before ALICE to reproduce the
    // exact failure mode: the old buggy rule built the lookup id as
    // `${reader}_${owner}`, which only matched storage for readers whose uid
    // sorted first. Use a reader uid that sorts AFTER the owner's.
    const owner = 'a-owner';
    const reader = 'z-reader'; // sorts after `owner`
    const partnershipDocId = sortedPartnershipId(owner, reader); // 'a-owner_z-reader'

    // Create the authenticated context (and its firestore() instance) before
    // any withSecurityRulesDisabled() call in this test — calling
    // .firestore() on a context created afterward hits a settings-already-
    // locked error in this SDK combination, an infra ordering quirk unrelated
    // to the rules themselves.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.collection('partnerships').doc(partnershipDocId).set({
        users: [owner, reader],
        status: 'active',
        optIns: { [owner]: true, [reader]: true },
      });
      await db.collection('profiles').doc(owner).set({ attachmentScores: {} });
    });

    const readerDb = testEnv.authenticatedContext(reader).firestore();
    await assertSucceeds(readerDb.collection('profiles').doc(owner).get());
  });
});

describe('partnerships: opt-in spoofing (bug #2 — either party could set BOTH optIns keys)', () => {
  async function seedPendingPartnership() {
    const docId = sortedPartnershipId(ALICE, BOB);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('partnerships').doc(docId).set({
        users: [ALICE, BOB],
        status: 'pending',
        optIns: { [ALICE]: true, [BOB]: false },
      });
    });
    return docId;
  }

  test('a participant cannot write the OTHER participant\'s optIns key to true', async () => {
    const docId = await seedPendingPartnership();
    const aliceCtx = testEnv.authenticatedContext(ALICE);
    // Alice already opted in; this attempts to also flip Bob's key herself.
    await assertFails(
      aliceCtx.firestore().collection('partnerships').doc(docId).update({
        optIns: { [ALICE]: true, [BOB]: true },
      })
    );
  });

  test('a participant CAN write only their own optIns key', async () => {
    const docId = await seedPendingPartnership();
    const bobCtx = testEnv.authenticatedContext(BOB);
    await assertSucceeds(
      bobCtx.firestore().collection('partnerships').doc(docId).update({
        optIns: { [ALICE]: true, [BOB]: true },
      })
    );
  });

  test('a creator cannot fabricate a fully-consented partnership on create', async () => {
    const docId = sortedPartnershipId(ALICE, BOB);
    const aliceCtx = testEnv.authenticatedContext(ALICE);
    await assertFails(
      aliceCtx.firestore().collection('partnerships').doc(docId).set({
        users: [ALICE, BOB],
        status: 'pending',
        optIns: { [ALICE]: true, [BOB]: true }, // the other side must start false
      })
    );
  });

  test('reading a not-yet-existing partnership doc does not throw / silently deny', async () => {
    const docId = sortedPartnershipId(ALICE, BOB);
    const aliceCtx = testEnv.authenticatedContext(ALICE);
    await assertSucceeds(aliceCtx.firestore().collection('partnerships').doc(docId).get());
  });
});

describe('owned collections: userId reassignment via update (bug #3)', () => {
  const OWNED_COLLECTIONS = [
    'daily_checkins',
    'action_logs',
    'bids',
    'memory_vault',
    'curiosity_card_progress',
    'desire_inventory',
  ];

  test.each(OWNED_COLLECTIONS)('%s: cannot reassign userId to a victim via update', async (collection) => {
    const mallory = testEnv.authenticatedContext(MALLORY);
    const docRef = mallory.firestore().collection(collection).doc('doc-1');
    await assertSucceeds(docRef.set({ userId: MALLORY, note: 'mine' }));
    // Attempt to hijack the doc into the victim's (ALICE's) own reads.
    await assertFails(docRef.update({ userId: ALICE }));
  });

  test.each(OWNED_COLLECTIONS)('%s: a normal field-only update (never touching userId) still succeeds', async (collection) => {
    const mallory = testEnv.authenticatedContext(MALLORY);
    const docRef = mallory.firestore().collection(collection).doc('doc-1');
    await assertSucceeds(docRef.set({ userId: MALLORY, note: 'mine' }));
    await assertSucceeds(docRef.update({ note: 'updated' }));
  });

  test.each(OWNED_COLLECTIONS)('%s: a stranger cannot read another user\'s doc', async (collection) => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection(collection).doc('victim-doc').set({ userId: ALICE });
    });
    const mallory = testEnv.authenticatedContext(MALLORY);
    await assertFails(mallory.firestore().collection(collection).doc('victim-doc').get());
  });
});

describe('waitlist_signups: public create-only, no read', () => {
  test('an unauthenticated visitor can submit a well-formed email', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(
      anon.firestore().collection('waitlist_signups').add({ email: 'test@example.com', source: 'marketing_landing' })
    );
  });

  test('a malformed email is rejected', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      anon.firestore().collection('waitlist_signups').add({ email: 'not-an-email', source: 'marketing_landing' })
    );
  });

  test('nobody (not even the submitter) can read the list back', async () => {
    const anon = testEnv.unauthenticatedContext();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('waitlist_signups').add({ email: 'seed@example.com' });
    });
    await assertFails(anon.firestore().collection('waitlist_signups').get());
  });
});
