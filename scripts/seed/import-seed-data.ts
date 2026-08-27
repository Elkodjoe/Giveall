/**
 * One-time seed loader for the public, read-only `suggested_actions` and
 * `curiosity_cards` collections (see firestore.rules — writes to these are
 * not client-accessible, so this must run with admin credentials).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json \
 *     npx ts-node scripts/seed/import-seed-data.ts
 *
 * curiosity_cards ids intentionally match the hardcoded CARDS array in
 * src/engine/curiosityLadder.ts (gj-1, vd-1, vr-1, ...) — that array is the
 * canonical copy for offline/pre-Firebase use; this file seeds the same
 * content into Firestore. If you edit one, edit the other.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import suggestedActions from './suggested_actions.json';
import curiosityCards from './curiosity_cards.json';

initializeApp();
const db = getFirestore();

async function seedCollection(collectionName: string, docs: { id: string }[]) {
  const batch = db.batch();
  for (const docData of docs) {
    const ref = db.collection(collectionName).doc(docData.id);
    batch.set(ref, docData);
  }
  await batch.commit();
  console.log(`Seeded ${docs.length} docs into ${collectionName}`);
}

async function main() {
  await seedCollection('suggested_actions', suggestedActions);
  await seedCollection('curiosity_cards', curiosityCards);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
