import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { LoveLanguageKey, ProfileDoc, ActionLogDoc } from '../../src/firebase/types';

const LOVE_LANGUAGES: LoveLanguageKey[] = ['words', 'acts', 'touch', 'quality_time', 'gifts'];
const EMA_ALPHA = 0.3; // deliberate: slow blending, not abrupt replacement
const MIN_LOGS_FOR_RECALIBRATION = 5;

type PartialWeights = Partial<Record<LoveLanguageKey, number>>;

function normalizeWeights(weights: Record<LoveLanguageKey, number>): Record<LoveLanguageKey, number> {
  const sum = LOVE_LANGUAGES.reduce((total, lang) => total + weights[lang], 0) || 1;
  const normalized = {} as Record<LoveLanguageKey, number>;
  for (const lang of LOVE_LANGUAGES) normalized[lang] = weights[lang] / sum;
  return normalized;
}

function topLanguage(weights: Record<LoveLanguageKey, number>): LoveLanguageKey {
  return LOVE_LANGUAGES.reduce((top, lang) => (weights[lang] > weights[top] ? lang : top));
}

/**
 * Recomputes one user's loveLanguageWeights from the last 7 days of
 * action_logs. Two rules from docs/02-love-os-brain.md #3 this
 * deliberately implements:
 *   - never recalibrate silently: every run writes a recalibration_events
 *     doc, whether it actually recalibrates or skips (and why).
 *   - blend gradually via EMA rather than replacing weights outright, so
 *     a single noisy day (or week) can't swing prescriptions abruptly.
 */
export async function recalculateUserWeights(userId: string): Promise<void> {
  const db = getFirestore();

  const profileSnap = await db.doc(`profiles/${userId}`).get();
  if (!profileSnap.exists) return;
  const profile = profileSnap.data() as ProfileDoc;
  const existingWeights = profile.loveLanguageWeights;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const logsSnap = await db
    .collection('action_logs')
    .where('userId', '==', userId)
    .where('timestamp', '>=', sevenDaysAgo)
    .get();

  if (logsSnap.size < MIN_LOGS_FOR_RECALIBRATION) {
    await db.collection('recalibration_events').add({
      userId,
      type: 'skipped_insufficient_logs',
      logCount: logsSnap.size,
      reason: `Need ${MIN_LOGS_FOR_RECALIBRATION}, got ${logsSnap.size}`,
      timestamp: FieldValue.serverTimestamp(),
    });
    return;
  }

  const grouped: Partial<Record<LoveLanguageKey, number[]>> = {};
  logsSnap.forEach((l) => {
    const d = l.data() as ActionLogDoc;
    (grouped[d.loveLanguageType] ??= []).push(d.partnerMoodDelta);
  });

  const rawAvgs: PartialWeights = {};
  for (const lang of LOVE_LANGUAGES) {
    const vals = grouped[lang];
    if (vals?.length) rawAvgs[lang] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // Shift so the lowest raw average lands just above zero, then normalize —
  // preserves relative ranking while keeping every weight non-negative.
  const presentAvgs = Object.values(rawAvgs) as number[];
  const minVal = Math.min(0, ...presentAvgs);
  const shifted: PartialWeights = {};
  for (const lang of LOVE_LANGUAGES) {
    if (rawAvgs[lang] !== undefined) shifted[lang] = rawAvgs[lang]! - minVal + 0.1;
  }
  const shiftedTotal = (Object.values(shifted) as number[]).reduce((a, b) => a + b, 0) || 1;
  const targetWeights: PartialWeights = {};
  for (const lang of LOVE_LANGUAGES) {
    if (shifted[lang] !== undefined) targetWeights[lang] = shifted[lang]! / shiftedTotal;
  }

  const blended = {} as Record<LoveLanguageKey, number>;
  for (const lang of LOVE_LANGUAGES) {
    const existing = existingWeights[lang] ?? 1 / LOVE_LANGUAGES.length;
    const target = targetWeights[lang] ?? 0;
    blended[lang] = EMA_ALPHA * target + (1 - EMA_ALPHA) * existing;
  }
  const normalized = normalizeWeights(blended);

  await db.collection('recalibration_events').add({
    userId,
    type: 'recalibrated',
    previousWeights: existingWeights,
    targetWeights,
    blendedWeights: normalized,
    topLanguageChanged: topLanguage(normalized) !== topLanguage(existingWeights),
    emaAlpha: EMA_ALPHA,
    logCount: logsSnap.size,
    rawAvgs,
    timestamp: FieldValue.serverTimestamp(),
  });

  await profileSnap.ref.update({
    loveLanguageWeights: normalized,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Runs nightly at 2am UTC — every profile gets one fresh pass.
export const nightlyRecalculateWeights = onSchedule('0 2 * * *', async () => {
  const db = getFirestore();
  const profilesSnap = await db.collection('profiles').get();
  await Promise.all(profilesSnap.docs.map((p) => recalculateUserWeights(p.id)));
});
