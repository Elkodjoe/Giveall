import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { ProfileDoc } from '../../src/firebase/types';
import { validateAttachmentScores } from '../../src/firebase/attachmentScores';

/**
 * attachmentScores is meant to be a normalized probability distribution
 * (sums to 1.0, see ProfileDoc in src/firebase/types.ts). onDocumentCreated
 * rather than onDocumentWritten deliberately: attachmentScores is set once
 * at onboarding and never touched again (the nightly job only updates
 * loveLanguageWeights) — see docs/04-firebase-schema.md.
 */
export const validateProfile = onDocumentCreated('profiles/{userId}', async (event) => {
  const data = event.data?.data() as ProfileDoc | undefined;
  if (!data?.attachmentScores) return;

  if (!validateAttachmentScores(data.attachmentScores)) {
    await getFirestore().collection('validation_events').add({
      userId: event.params.userId,
      type: 'attachmentScores_sum_invalid',
      attachmentScores: data.attachmentScores,
      timestamp: FieldValue.serverTimestamp(),
    });
  }
});
