/**
 * recalculateUserWeights (functions/src/recalculateWeights.ts) is the most
 * logic-heavy piece of the four Cloud Functions — EMA blending, weight
 * normalization, the "never recalibrate silently" audit trail — and was
 * previously untested entirely (none of the four functions were, despite
 * compiling cleanly this whole time). Runs against a real Firestore
 * emulator via firebase-admin (server-side trust, bypasses rules by
 * design — this isn't a rules test) rather than deeply mocking the
 * chained Firestore query builder, so it exercises real read/write
 * behavior. See package.json's "test" script for how the emulator gets
 * started/stopped around this run.
 */
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8085';
process.env.GCLOUD_PROJECT = 'giveall-functions-test';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { recalculateUserWeights } from '../recalculateWeights';
import type { LoveLanguageKey, ProfileDoc } from '../../../src/firebase/types';

initializeApp({ projectId: 'giveall-functions-test' });
const db = getFirestore();

const EQUAL_WEIGHTS: Record<LoveLanguageKey, number> = {
  words: 0.2,
  acts: 0.2,
  touch: 0.2,
  quality_time: 0.2,
  gifts: 0.2,
};

async function clearAll() {
  for (const col of ['profiles', 'action_logs', 'recalibration_events']) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

beforeEach(clearAll);
afterAll(clearAll);

async function seedProfile(userId: string, weights = EQUAL_WEIGHTS): Promise<ProfileDoc> {
  const profile = {
    loveLanguageWeights: weights,
    attachmentScores: { secure: 1, anxious: 0, avoidant: 0, fearful: 0 },
  } as unknown as ProfileDoc;
  await db.doc(`profiles/${userId}`).set(profile);
  return profile;
}

async function seedActionLog(userId: string, loveLanguageType: LoveLanguageKey, partnerMoodDelta: number) {
  await db.collection('action_logs').add({
    userId,
    loveLanguageType,
    partnerMoodDelta,
    timestamp: Timestamp.fromDate(new Date()),
  });
}

describe('recalculateUserWeights', () => {
  test('does nothing for a user with no profile doc', async () => {
    await recalculateUserWeights('nobody');
    const events = await db.collection('recalibration_events').get();
    expect(events.size).toBe(0);
  });

  test('skips and logs why when fewer than 5 trailing action_logs exist', async () => {
    const userId = 'sparse-user';
    await seedProfile(userId);
    for (let i = 0; i < 3; i++) await seedActionLog(userId, 'words', 1);

    await recalculateUserWeights(userId);

    const events = await db.collection('recalibration_events').where('userId', '==', userId).get();
    expect(events.size).toBe(1);
    expect(events.docs[0].data()).toMatchObject({ type: 'skipped_insufficient_logs', logCount: 3 });

    // Never recalibrate silently: weights must be untouched on skip.
    const profile = (await db.doc(`profiles/${userId}`).get()).data() as ProfileDoc;
    expect(profile.loveLanguageWeights).toEqual(EQUAL_WEIGHTS);
  });

  test('blends toward the language with the best self-reported mood delta, without fully replacing existing weights', async () => {
    const userId = 'words-favored-user';
    // Start with "acts" narrowly on top (not "words" — EQUAL_WEIGHTS' tie
    // resolves to the first array entry, "words", which would make this
    // test pass even with a broken topLanguageChanged calculation).
    await seedProfile(userId, { words: 0.1975, acts: 0.21, touch: 0.1975, quality_time: 0.1975, gifts: 0.1975 });
    // 5 logs, all "words", all strongly positive — should pull "words" up
    // but NOT to 1.0 in a single pass (EMA_ALPHA = 0.3, gradual blending).
    for (let i = 0; i < 5; i++) await seedActionLog(userId, 'words', 2);

    await recalculateUserWeights(userId);

    const profile = (await db.doc(`profiles/${userId}`).get()).data() as ProfileDoc;
    const weights = profile.loveLanguageWeights;

    expect(weights.words).toBeGreaterThan(0.1975); // its starting weight
    expect(weights.words).toBeLessThan(1); // gradual, not a full replace
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5); // stays a normalized distribution

    const events = await db.collection('recalibration_events').where('userId', '==', userId).get();
    expect(events.size).toBe(1);
    expect(events.docs[0].data()).toMatchObject({ type: 'recalibrated', topLanguageChanged: true });
  });

  test('topLanguageChanged is false when the recalibration does not flip the top language', async () => {
    const userId = 'stable-user';
    // Start heavily weighted toward "acts" already — a handful of "words"
    // logs shouldn't be enough to overtake the existing strong lead.
    await seedProfile(userId, { words: 0.05, acts: 0.8, touch: 0.05, quality_time: 0.05, gifts: 0.05 });
    for (let i = 0; i < 5; i++) await seedActionLog(userId, 'words', 1);

    await recalculateUserWeights(userId);

    const events = await db.collection('recalibration_events').where('userId', '==', userId).get();
    expect(events.docs[0].data()).toMatchObject({ type: 'recalibrated', topLanguageChanged: false });
  });

  test('action_logs older than 7 days are excluded from the window', async () => {
    const userId = 'stale-logs-user';
    await seedProfile(userId);
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    for (let i = 0; i < 5; i++) {
      await db.collection('action_logs').add({
        userId,
        loveLanguageType: 'words',
        partnerMoodDelta: 2,
        timestamp: Timestamp.fromDate(eightDaysAgo),
      });
    }

    await recalculateUserWeights(userId);

    const events = await db.collection('recalibration_events').where('userId', '==', userId).get();
    expect(events.docs[0].data()).toMatchObject({ type: 'skipped_insufficient_logs', logCount: 0 });
  });
});
