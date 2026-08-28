import type { ProfileDoc } from './types';

const SUM_TOLERANCE = 0.02;

/**
 * Checks both that the four attachmentScores components actually sum to
 * ~1.0 AND that the stored _sum field agrees with that computed sum —
 * catches a stale/wrong _sum even when the components themselves are fine.
 * Used by functions/src/validateProfile.ts; kept here (not inline in the
 * function) so it's independently unit-testable.
 */
export function validateAttachmentScores(scores: ProfileDoc['attachmentScores']): boolean {
  const computedSum =
    scores.secure + scores.anxious_preoccupied + scores.dismissive_avoidant + scores.fearful_avoidant;
  return Math.abs(computedSum - 1.0) < SUM_TOLERANCE && Math.abs(scores._sum - 1.0) < SUM_TOLERANCE;
}
