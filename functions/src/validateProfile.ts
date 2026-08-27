import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import type { ProfileDoc } from '../../src/firebase/types';

const SUM_TOLERANCE = 0.02;

/**
 * attachmentScores is meant to be a normalized probability distribution
 * (sums to 1.0, see ProfileDoc in src/firebase/types.ts). This doesn't
 * enforce that via firestore.rules — validating floating-point sums in
 * security rules is awkward — so instead it logs a warning any time a
 * profile write violates it, for someone to notice and fix upstream.
 */
export const validateProfile = onDocumentWritten('profiles/{userId}', async (event) => {
  const after = event.data?.after.data() as ProfileDoc | undefined;
  if (!after?.attachmentScores) return;

  const sum = after.attachmentScores._sum;
  if (Math.abs(sum - 1.0) > SUM_TOLERANCE) {
    logger.warn(`attachmentScores._sum invalid for profiles/${event.params.userId}: ${sum}`);
  }
});
