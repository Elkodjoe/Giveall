import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { PartnershipDoc } from '../../src/firebase/types';

/**
 * firestore.rules blocks clients from writing `status` on /partnerships
 * directly (double opt-in must be server-verified). This trigger is what
 * actually flips 'pending' -> 'active' once both participants have opted
 * in, and mirrors the resulting partnerId onto both /users docs.
 */
export const activatePartnership = onDocumentWritten('partnerships/{partnershipId}', async (event) => {
  const after = event.data?.after.data() as PartnershipDoc | undefined;
  if (!after || after.status !== 'pending') return;

  const [uidA, uidB] = after.participants;
  const bothOptedIn = after.optIns[uidA] === true && after.optIns[uidB] === true;
  if (!bothOptedIn) return;

  const db = getFirestore();
  await Promise.all([
    event.data?.after.ref.update({ status: 'active' }),
    db.doc(`users/${uidA}`).update({ partnerId: uidB }),
    db.doc(`users/${uidB}`).update({ partnerId: uidA }),
  ]);
});
