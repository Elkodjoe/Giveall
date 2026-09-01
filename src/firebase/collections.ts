import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import { db } from './config';
import type {
  UserDoc,
  ProfileDoc,
  DailyCheckinDoc,
  BidDoc,
  SuggestedActionDoc,
  ActionLogDoc,
  CuriosityCardDoc,
  CuriosityCardProgressDoc,
  MemoryVaultDoc,
  DesireInventoryDoc,
  PartnershipDoc,
  RecalibrationEventDoc,
  LoveLanguageKey,
} from './types';

// Thin, typed wrappers over the raw Firestore SDK, one per collection named
// in firestore.rules. Deliberately no caching/state layer here — that's a
// call for whatever state library the app adopts later.

function converter<T>() {
  return {
    toFirestore: (data: T) => data as Record<string, unknown>,
    fromFirestore: (snap: QueryDocumentSnapshot, options: SnapshotOptions) =>
      snap.data(options) as T,
  };
}

const usersCol = collection(db, 'users').withConverter(converter<UserDoc>());
const profilesCol = collection(db, 'profiles').withConverter(converter<ProfileDoc>());
const dailyCheckinsCol = collection(db, 'daily_checkins').withConverter(converter<DailyCheckinDoc>());
const bidsCol = collection(db, 'bids').withConverter(converter<BidDoc>());
const suggestedActionsCol = collection(db, 'suggested_actions').withConverter(converter<SuggestedActionDoc>());
const actionLogsCol = collection(db, 'action_logs').withConverter(converter<ActionLogDoc>());
const curiosityCardsCol = collection(db, 'curiosity_cards').withConverter(converter<CuriosityCardDoc>());
const curiosityCardProgressCol = collection(db, 'curiosity_card_progress').withConverter(
  converter<CuriosityCardProgressDoc>(),
);
const memoryVaultCol = collection(db, 'memory_vault').withConverter(converter<MemoryVaultDoc>());
const desireInventoryCol = collection(db, 'desire_inventory').withConverter(converter<DesireInventoryDoc>());
const partnershipsCol = collection(db, 'partnerships').withConverter(converter<PartnershipDoc>());

export async function getUser(uid: string): Promise<UserDoc | undefined> {
  const snap = await getDoc(doc(usersCol, uid));
  return snap.exists() ? snap.data() : undefined;
}

// Idempotent: leaves an existing UserDoc's createdAt untouched (that's the
// value app/curiosity.tsx anchors the intimacy ladder to — overwriting it
// on every onboarding-completion visit would silently reset the ladder).
export async function createUserIfNeeded(user: Omit<UserDoc, 'createdAt'>): Promise<void> {
  const existing = await getUser(user.uid);
  if (existing) return;
  await setDoc(doc(collection(db, 'users'), user.uid), { ...user, createdAt: serverTimestamp() });
}

export async function getProfile(userId: string): Promise<ProfileDoc | undefined> {
  const snap = await getDoc(doc(profilesCol, userId));
  return snap.exists() ? snap.data() : undefined;
}

export async function setProfile(userId: string, profile: Omit<ProfileDoc, 'updatedAt'>): Promise<void> {
  await setDoc(doc(collection(db, 'profiles'), userId), { ...profile, updatedAt: serverTimestamp() });
}

export async function updateProfileLoveLanguageReceive(
  userId: string,
  loveLanguageReceive: LoveLanguageKey,
): Promise<void> {
  await updateDoc(doc(collection(db, 'profiles'), userId), { loveLanguageReceive, updatedAt: serverTimestamp() });
}

export async function logRecalibrationEvent(entry: Omit<RecalibrationEventDoc, 'timestamp'>): Promise<void> {
  await addDoc(collection(db, 'recalibration_events'), { ...entry, timestamp: serverTimestamp() });
}

export async function getDailyCheckinsLastNDays(userId: string, days: number): Promise<DailyCheckinDoc[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const q = query(
    dailyCheckinsCol,
    where('userId', '==', userId),
    where('date', '>=', cutoffStr),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function addDailyCheckin(checkin: Omit<DailyCheckinDoc, 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'daily_checkins'), { ...checkin, createdAt: serverTimestamp() });
}

export async function getBidsLastNDays(userId: string, days: number): Promise<BidDoc[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const q = query(
    bidsCol,
    where('userId', '==', userId),
    where('date', '>=', cutoffStr),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function addBid(bid: Omit<BidDoc, 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'bids'), { ...bid, createdAt: serverTimestamp() });
}

export async function getSuggestedActions(): Promise<SuggestedActionDoc[]> {
  const snap = await getDocs(suggestedActionsCol);
  return snap.docs.map((d) => d.data());
}

export async function logAction(entry: Omit<ActionLogDoc, 'timestamp'>): Promise<void> {
  // serverTimestamp() is a FieldValue sentinel at write time, not a real
  // Timestamp — Firestore resolves it server-side, so the collection ref's
  // ActionLogDoc converter type doesn't apply to this particular write.
  await addDoc(collection(db, 'action_logs'), { ...entry, timestamp: serverTimestamp() });
}

export async function getActionLogsLastNDays(userId: string, days: number): Promise<ActionLogDoc[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const q = query(
    actionLogsCol,
    where('userId', '==', userId),
    where('timestamp', '>=', cutoff),
    orderBy('timestamp', 'desc'),
    fsLimit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function getCuriosityCardsForLevel(level: 1 | 2 | 3): Promise<CuriosityCardDoc[]> {
  const q = query(curiosityCardsCol, where('level', '==', level));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function getCompletedCuriosityCardIds(userId: string): Promise<string[]> {
  const q = query(curiosityCardProgressCol, where('userId', '==', userId), where('isCompleted', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().cardId);
}

function curiosityCardProgressId(userId: string, cardId: string): string {
  return `${userId}_${cardId}`;
}

export async function markCuriosityCardCompleted(userId: string, cardId: string): Promise<void> {
  // Doc id is deterministic ("{userId}_{cardId}") so this is an idempotent
  // upsert — marking the same card done twice doesn't create duplicates.
  await setDoc(doc(collection(db, 'curiosity_card_progress'), curiosityCardProgressId(userId, cardId)), {
    userId,
    cardId,
    isCompleted: true,
    completedAt: serverTimestamp(),
  });
}

export async function addMemoryVaultEntry(entry: MemoryVaultDoc): Promise<void> {
  await addDoc(memoryVaultCol, entry);
}

// MemoryVaultDoc has no `id` field of its own (Firestore's doc id lives
// outside the document body) — these list functions attach it, since the
// UI needs it for mark-used/delete.
export interface MemoryVaultEntryWithId extends MemoryVaultDoc {
  id: string;
}

export async function getAllMemoryVaultEntries(userId: string): Promise<MemoryVaultEntryWithId[]> {
  const q = query(memoryVaultCol, where('userId', '==', userId), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUnusedMemoryVaultEntries(userId: string): Promise<MemoryVaultEntryWithId[]> {
  const q = query(
    memoryVaultCol,
    where('userId', '==', userId),
    where('usedInGeneration', '==', false),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markMemoryVaultEntryUsed(entryId: string): Promise<void> {
  await updateDoc(doc(memoryVaultCol, entryId), { usedInGeneration: true });
}

export async function deleteMemoryVaultEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(memoryVaultCol, entryId));
}

// "You can delete your Memory Vault anytime" — the privacy guardrail
// promise in docs/03-power-ups.md #3. Used by the Settings screen.
export async function deleteAllMemoryVaultEntries(userId: string): Promise<void> {
  const entries = await getAllMemoryVaultEntries(userId);
  await Promise.all(entries.map((e) => deleteMemoryVaultEntry(e.id)));
}

export interface DesireInventoryEntryWithId extends DesireInventoryDoc {
  id: string;
}

export async function addDesireInventoryEntry(entry: Omit<DesireInventoryDoc, 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'desire_inventory'), { ...entry, createdAt: serverTimestamp() });
}

export async function getAllDesireInventoryEntries(userId: string): Promise<DesireInventoryEntryWithId[]> {
  const q = query(desireInventoryCol, where('userId', '==', userId), orderBy('rank', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Ordered by rank so the first result is the most-wanted unused desire —
// matches decisionMatrix.ts's nextUnused() semantics (first unused wins),
// but makes "first" actually mean "highest-ranked" instead of insertion
// order, which is what "1 = most wanted" implies.
export async function getUnusedDesireInventoryEntries(userId: string): Promise<DesireInventoryEntryWithId[]> {
  const q = query(
    desireInventoryCol,
    where('userId', '==', userId),
    where('used', '==', false),
    orderBy('rank', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markDesireInventoryEntryUsed(entryId: string): Promise<void> {
  await updateDoc(doc(desireInventoryCol, entryId), { used: true });
}

export async function deleteDesireInventoryEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(desireInventoryCol, entryId));
}

function partnershipId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export async function requestPartnership(uidA: string, uidB: string): Promise<void> {
  const id = partnershipId(uidA, uidB);
  // Same FieldValue-vs-Timestamp mismatch as logAction() above — write
  // through the uncoverted collection ref for this one field.
  await setDoc(doc(collection(db, 'partnerships'), id), {
    users: [uidA, uidB].sort() as [string, string],
    optIns: { [uidA]: true, [uidB]: false },
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function optInToPartnership(uidA: string, uidB: string, uid: string): Promise<void> {
  const id = partnershipId(uidA, uidB);
  await updateDoc(doc(partnershipsCol, id), { [`optIns.${uid}`]: true });
  // Flipping status to 'active' once both optIns are true is intentionally
  // NOT done here — firestore.rules blocks clients from writing `status`.
  // That flip belongs in a Cloud Function triggered on partnerships writes
  // (functions/src/activatePartnership.ts) — not deployed yet, so a
  // partnership can reach "both opted in" and still show 'pending' until
  // Cloud Functions are live. See docs/06-firebase-provisioning.md.
}

export async function getPartnership(uidA: string, uidB: string): Promise<PartnershipDoc | undefined> {
  const id = partnershipId(uidA, uidB);
  const snap = await getDoc(doc(partnershipsCol, id));
  return snap.exists() ? snap.data() : undefined;
}

// Every collection whose docs carry a `userId` field and grant the owner
// `delete` in firestore.rules. `recalibration_events` is append-only for
// updates but deletable by its owner, precisely so this can wipe it.
const USER_OWNED_COLLECTIONS = [
  'daily_checkins',
  'action_logs',
  'bids',
  'memory_vault',
  'curiosity_card_progress',
  'desire_inventory',
  'recalibration_events',
] as const;

/**
 * Deletes every Firestore document tied to this uid — the owned
 * collections above, any partnership the user is part of, their profile,
 * and their user doc. Backs "Delete my account" (app/account.tsx); Apple
 * guideline 5.1.1(v) requires in-app account + data deletion for any app
 * that supports account creation.
 *
 * Must run while the user is still signed in. Delete the auth user
 * afterwards (deleteCurrentUser in auth.ts). Best-effort per doc — a
 * single failed delete doesn't abort the rest.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  for (const name of USER_OWNED_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where('userId', '==', uid)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => undefined)));
  }

  const partnerships = await getDocs(
    query(collection(db, 'partnerships'), where('users', 'array-contains', uid)),
  );
  await Promise.all(partnerships.docs.map((d) => deleteDoc(d.ref).catch(() => undefined)));

  await deleteDoc(doc(db, 'profiles', uid)).catch(() => undefined);
  await deleteDoc(doc(db, 'users', uid)).catch(() => undefined);
}
