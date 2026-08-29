/**
 * Quick doc-count/id dump across every collection, for verifying a
 * deployment or debugging security rules. Usage:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json \
 *     node scripts/seed/check-firestore.js
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const COLLECTIONS = [
  'users',
  'profiles',
  'daily_checkins',
  'bids',
  'action_logs',
  'memory_vault',
  'curiosity_card_progress',
  'partnerships',
  'suggested_actions',
  'curiosity_cards',
];

(async () => {
  for (const col of COLLECTIONS) {
    const snap = await db.collection(col).get();
    console.log(`${col}: ${snap.size} docs`);
    snap.forEach((d) => console.log('  -', d.id));
  }
})().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
