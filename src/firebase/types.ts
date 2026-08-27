import type { AttachmentStyle } from '../engine/types';

// Deliberately not `firebase/firestore`'s Timestamp: this file is shared
// between the Expo client (firebase JS SDK) and Cloud Functions
// (firebase-admin), whose Timestamp types are distinct classes. Both
// satisfy this shape structurally.
export interface FirestoreTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}
type Timestamp = FirestoreTimestamp;

// Firestore document shapes. Fields and collection names mirror the
// designer/dev Figma+Firebase handoff (see docs/04-firebase-schema.md).
// Distinct from src/engine/types.ts, which models the client-side rules
// engine's primary/secondary categorical view — these are the persisted,
// continuous-weight documents the nightly recalibration job reads/writes.

export interface UserDoc {
  uid: string;
  createdAt: Timestamp;
  onboardingPersona: 'crush' | 'new' | 'longterm' | 'healing';
  notificationTime: string; // "HH:mm", 24h
  subscriptionTier: 'free' | 'premium_solo' | 'premium_partner';
  partnerId?: string; // set only after double opt-in via /partnerships
  timezone: string; // IANA tz name
}

export type LoveLanguageKey = 'words' | 'acts' | 'touch' | 'quality_time' | 'gifts';

export interface ProfileDoc {
  userId: string;
  attachmentStyle: AttachmentStyle;
  attachmentScores: Record<AttachmentStyle, number>; // sums to ~1.0
  loveLanguageGive: LoveLanguageKey;
  loveLanguageReceive: LoveLanguageKey;
  loveLanguageWeights: Record<LoveLanguageKey, number>; // sums to ~1.0, EMA-updated nightly
  desireInventory: string[];
}

export interface DailyCheckinDoc {
  userId: string;
  date: string; // "YYYY-MM-DD"
  seen_score: number; // 1-5
  safe_score: number; // 1-5
  sought_score: number; // 1-5
  mood: number; // 1-5
  contextTags: string[];
  note?: string;
}

export type BidType = 'comment' | 'touch' | 'joke' | 'question' | 'help';
export type BidResponseType = 'toward' | 'away' | 'against';

export interface BidDoc {
  userId: string;
  date: string; // "YYYY-MM-DD"
  bidDescription: string;
  bidType: BidType;
  response: BidResponseType;
  ratioWeekly: number; // % toward over trailing 7 days, denormalized for quick reads
}

// Public, read-only catalog of prescribable actions (seeded, not user-authored).
export interface SuggestedActionDoc {
  id: string;
  type: 'micro_surprise' | 'recall_detail' | 'appreciation' | 'checkin' | 'desire' | 'repair';
  loveLanguageType: LoveLanguageKey;
  // 'all' targets every attachment style — most actions (e.g. Recall Detail,
  // Specific Desire) are universal; only safe_score repair actions are
  // usually attachment-specific. See src/engine/decisionMatrix.ts for the
  // equivalent client-side branching logic this seed data parallels.
  attachmentTarget: AttachmentStyle[] | 'all';
  effortLevel: 'low' | 'medium' | 'high';
  trigger: string; // e.g. "safe_score < 6" or "seen_score < 6"
  copy: string;
  whyItWorks: string;
}

// A user's log of having been shown/completed a suggested_actions entry.
export interface ActionLogDoc {
  userId: string;
  actionId: string; // references SuggestedActionDoc.id
  timestamp: Timestamp;
  partnerMoodDelta: -2 | -1 | 0 | 1 | 2; // self-reported
  wasCompleted: boolean;
  context?: string;
}

// Public, read-only catalog of curiosity prompts (seeded, not user-authored).
export interface CuriosityCardDoc {
  id: string;
  level: 1 | 2 | 3; // 1-joy, 2-values, 3-vulnerability; maps to CuriosityTier in src/engine/curiosityLadder.ts
  week: number; // specific unlock week, finer-grained than CuriosityTier's 3 bands
  question: string;
  category: string; // e.g. "joy", "appreciation", "seen", "dreams", "safety", "vulnerability", "history"
}

// Per-user completion state for a curiosity card, stored under the user
// rather than mutating the public catalog doc.
export interface CuriosityCardProgressDoc {
  userId: string;
  cardId: string;
  isCompleted: boolean;
  completedAt?: Timestamp;
}

export interface MemoryVaultDoc {
  userId: string;
  type: 'photo' | 'joke' | 'detail' | 'appreciation';
  content: string;
  date: string; // "YYYY-MM-DD"
  sentiment: 'warm' | 'neutral' | 'tense';
  usedInGeneration: boolean;
}

export interface PartnershipDoc {
  participants: [string, string]; // two uids, doc id is "{uidA}_{uidB}" sorted
  optIns: Record<string, boolean>; // uid -> has this participant opted in
  status: 'pending' | 'active';
}
