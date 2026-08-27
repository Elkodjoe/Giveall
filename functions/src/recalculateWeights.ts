import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import type { LoveLanguageKey, ProfileDoc, ActionLogDoc } from '../../src/firebase/types';

const LOVE_LANGUAGES: LoveLanguageKey[] = ['words', 'acts', 'touch', 'quality_time', 'gifts'];
const MIN_LOGS_FOR_SIGNAL = 3;
const EMA_ALPHA = 0.3; // weight given to the new signal vs. the existing weight
const WEIGHT_MIN = 0.05;
const WEIGHT_MAX = 0.6;

// clamp partnerMoodDelta (-2..2) to a 0..1 signal for the EMA blend
function normalizeMoodDelta(delta: number): number {
  return (delta + 2) / 4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWeights(weights: Record<LoveLanguageKey, number>): Record<LoveLanguageKey, number> {
  const sum = LOVE_LANGUAGES.reduce((total, lang) => total + weights[lang], 0);
  const normalized = {} as Record<LoveLanguageKey, number>;
  for (const lang of LOVE_LANGUAGES) normalized[lang] = weights[lang] / sum;
  return normalized;
}

/**
 * Recomputes one user's loveLanguageWeights from the last 7 days of
 * action_logs, using an exponential moving average so a single noisy day
 * can't swing the weights — see docs/02-love-os-brain.md #3 for the product
 * rule (never recalibrate silently) this implements.
 */
export async function recalculateUserWeights(userId: string): Promise<void> {
  const db = getFirestore();

  const profileSnap = await db.doc(`profiles/${userId}`).get();
  if (!profileSnap.exists) return;
  const profile = profileSnap.data() as ProfileDoc;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const logsSnap = await db
    .collection('action_logs')
    .where('userId', '==', userId)
    .where('timestamp', '>=', sevenDaysAgo)
    .get();
  const logs = logsSnap.docs.map((d) => d.data() as ActionLogDoc & { loveLanguageType?: LoveLanguageKey });

  if (logs.length < MIN_LOGS_FOR_SIGNAL) return;

  const actionIds = [...new Set(logs.map((l) => l.actionId))];
  const actionDocs = await Promise.all(actionIds.map((id) => db.doc(`suggested_actions/${id}`).get()));
  const languageByActionId = new Map<string, LoveLanguageKey>();
  actionDocs.forEach((snap) => {
    if (snap.exists) languageByActionId.set(snap.id, snap.data()?.loveLanguageType);
  });

  const newWeights = { ...profile.loveLanguageWeights };
  for (const lang of LOVE_LANGUAGES) {
    const relevant = logs.filter((l) => languageByActionId.get(l.actionId) === lang);
    if (relevant.length === 0) continue;
    const avgSignal =
      relevant.reduce((sum, l) => sum + normalizeMoodDelta(l.partnerMoodDelta), 0) / relevant.length;
    const prevWeight = profile.loveLanguageWeights[lang];
    const blended = EMA_ALPHA * avgSignal + (1 - EMA_ALPHA) * prevWeight;
    newWeights[lang] = clamp(blended, WEIGHT_MIN, WEIGHT_MAX);
  }

  const normalized = normalizeWeights(newWeights);
  const previousTop = topLanguage(profile.loveLanguageWeights);
  const newTop = topLanguage(normalized);

  await db.doc(`profiles/${userId}`).update({ loveLanguageWeights: normalized });

  // Recalibration must never be silent — see docs/02-love-os-brain.md #3.
  // Client reads this doc and shows: "We learned you feel most loved
  // through {newTop} — adjusting your reps."
  if (newTop !== previousTop) {
    await db.collection('recalibration_events').add({
      userId,
      previousTop,
      newTop,
      weights: normalized,
      occurredAt: new Date(),
      acknowledged: false,
    });
  }
}

function topLanguage(weights: Record<LoveLanguageKey, number>): LoveLanguageKey {
  return LOVE_LANGUAGES.reduce((top, lang) => (weights[lang] > weights[top] ? lang : top));
}

// Runs nightly at 2am UTC — every active user's weights get one fresh pass.
export const nightlyRecalculateWeights = onSchedule('0 2 * * *', async () => {
  const db = getFirestore();
  const usersSnap = await db.collection('users').get();
  await Promise.all(usersSnap.docs.map((u) => recalculateUserWeights(u.id)));
});
