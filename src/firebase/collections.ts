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
  MemoryVaultDoc,
  PartnershipDoc,
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
const memoryVaultCol = collection(db, 'memory_vault').withConverter(converter<MemoryVaultDoc>());
const partnershipsCol = collection(db, 'partnerships').withConverter(converter<PartnershipDoc>());

export async function getUser(uid: string): Promise<UserDoc | undefined> {
  const snap = await getDoc(doc(usersCol, uid));
  return snap.exists() ? snap.data() : undefined;
}

export async function getProfile(userId: string): Promise<ProfileDoc | undefined> {
  const snap = await getDoc(doc(profilesCol, userId));
  return snap.exists() ? snap.data() : undefined;
}

export async function setProfile(userId: string, profile: Omit<ProfileDoc, 'updatedAt'>): Promise<void> {
  await setDoc(doc(collection(db, 'profiles'), userId), { ...profile, updatedAt: serverTimestamp() });
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

export async function addMemoryVaultEntry(entry: MemoryVaultDoc): Promise<void> {
  await addDoc(memoryVaultCol, entry);
}

export async function getUnusedMemoryVaultEntries(userId: string): Promise<MemoryVaultDoc[]> {
  const q = query(
    memoryVaultCol,
    where('userId', '==', userId),
    where('usedInGeneration', '==', false),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
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
  // That flip belongs in a Cloud Function triggered on partnerships writes.
}
