import type { AttachmentStyle, LoveLanguage } from '../engine/types';
import { tallyAttachment, tallyLoveLanguage } from '../engine/onboardingScoring';
import { attachmentStyleToFirestore, type FirestoreAttachmentStyle, type LoveLanguageKey, type ProfileDoc } from './types';

const FIRESTORE_ATTACHMENT_STYLES: FirestoreAttachmentStyle[] = [
  'secure',
  'anxious_preoccupied',
  'dismissive_avoidant',
  'fearful_avoidant',
];

const LOVE_LANGUAGES: LoveLanguageKey[] = ['words', 'acts', 'touch', 'quality_time', 'gifts'];

/**
 * Builds the normalized + raw attachmentScores pair from onboarding's 6
 * attachment-question answers. scores sums to 1.0 (barring floating-point
 * noise) by construction, so validateAttachmentScores() should always pass
 * on freshly-built output — it's the nightly job's later mutations (there
 * are none currently) or manual edits it's meant to catch.
 */
export function buildAttachmentScores(answers: AttachmentStyle[]): {
  scores: ProfileDoc['attachmentScores'];
  raw: ProfileDoc['attachmentScoresRaw'];
} {
  const raw = { secure: 0, anxious_preoccupied: 0, dismissive_avoidant: 0, fearful_avoidant: 0 };
  for (const a of answers) raw[attachmentStyleToFirestore(a)] += 1;

  const total = answers.length || 1;
  const scoresWithoutSum = {} as Record<FirestoreAttachmentStyle, number>;
  for (const style of FIRESTORE_ATTACHMENT_STYLES) scoresWithoutSum[style] = raw[style] / total;
  const sum = FIRESTORE_ATTACHMENT_STYLES.reduce((t, s) => t + scoresWithoutSum[s], 0);

  return { scores: { ...scoresWithoutSum, _sum: sum }, raw };
}

/**
 * Seeds loveLanguageWeights before any action_logs exist for the nightly
 * EMA job (functions/src/recalculateWeights.ts) to blend against — giving
 * the onboarding-derived primary language a high initial weight and
 * splitting the rest evenly, per docs/04-firebase-schema.md.
 */
export function buildInitialLoveLanguageWeights(primary: LoveLanguage): Record<LoveLanguageKey, number> {
  const primaryWeight = 0.5;
  const remainingWeight = (1 - primaryWeight) / (LOVE_LANGUAGES.length - 1);
  const weights = {} as Record<LoveLanguageKey, number>;
  for (const lang of LOVE_LANGUAGES) weights[lang] = lang === primary ? primaryWeight : remainingWeight;
  return weights;
}

/**
 * Derives a full ProfileDoc (minus updatedAt, set by the caller/write
 * helper) from raw onboarding answers. Note: `mode` (crush/new/longterm/
 * healing) is NOT part of ProfileDoc — it belongs on UserDoc.onboardingPersona,
 * a separate write this function deliberately doesn't make.
 */
export function buildInitialProfile(params: {
  userId: string;
  attachmentAnswers: AttachmentStyle[];
  loveLanguagePicks: LoveLanguage[];
  notificationTime: string;
}): Omit<ProfileDoc, 'updatedAt'> {
  const { primary: attachmentPrimary } = tallyAttachment(params.attachmentAnswers);
  const { primary: receivesVia, secondary: givesVia } = tallyLoveLanguage(params.loveLanguagePicks);
  const { scores, raw } = buildAttachmentScores(params.attachmentAnswers);
  const firestoreStyle = attachmentStyleToFirestore(attachmentPrimary);

  return {
    userId: params.userId,
    attachmentStyle: firestoreStyle,
    attachmentStyleDominant: firestoreStyle,
    attachmentScores: scores,
    attachmentScoresRaw: raw,
    loveLanguageGive: givesVia,
    loveLanguageReceive: receivesVia,
    loveLanguageWeights: buildInitialLoveLanguageWeights(receivesVia),
    desireInventory: [],
    notificationTime: params.notificationTime,
  };
}
