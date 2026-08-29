import type { AttachmentStyle, Mode } from '../engine/types';

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
// designer/dev Figma+Firebase handoff (see docs/04-firebase-schema.md,
// "Locked schema v2" section) — the three naming conflicts flagged in an
// earlier pass (attachmentStyle format, attachmentScores normalization,
// mood field type) are resolved here per that lock-in.
// Distinct from src/engine/types.ts, which models the client-side rules
// engine's primary/secondary categorical view — these are the persisted,
// continuous-weight documents the nightly recalibration job reads/writes.

// Firestore's persisted attachment style enum — snake_case, distinct from
// src/engine/types.ts's AttachmentStyle (short categorical names used
// throughout the client-side rules engine). See attachmentStyleToFirestore
// / attachmentStyleFromFirestore below for the mapping between the two;
// the engine's shorter union was NOT renamed to match, to avoid an invasive
// rename across already-tested engine code for a naming-only difference.
export type FirestoreAttachmentStyle =
  | 'secure'
  | 'anxious_preoccupied'
  | 'dismissive_avoidant'
  | 'fearful_avoidant';

const ATTACHMENT_STYLE_TO_FIRESTORE: Record<AttachmentStyle, FirestoreAttachmentStyle> = {
  secure: 'secure',
  anxious: 'anxious_preoccupied',
  avoidant: 'dismissive_avoidant',
  fearful: 'fearful_avoidant',
};

const ATTACHMENT_STYLE_FROM_FIRESTORE: Record<FirestoreAttachmentStyle, AttachmentStyle> = {
  secure: 'secure',
  anxious_preoccupied: 'anxious',
  dismissive_avoidant: 'avoidant',
  fearful_avoidant: 'fearful',
};

export function attachmentStyleToFirestore(style: AttachmentStyle): FirestoreAttachmentStyle {
  return ATTACHMENT_STYLE_TO_FIRESTORE[style];
}

export function attachmentStyleFromFirestore(style: FirestoreAttachmentStyle): AttachmentStyle {
  return ATTACHMENT_STYLE_FROM_FIRESTORE[style];
}

// Firestore's persisted onboarding persona — distinct spellings from
// src/engine/types.ts's Mode ('new' -> 'dating_new', 'ltr' -> 'longterm')
// for the same reason as FirestoreAttachmentStyle above: this is the
// designer/dev handoff's naming, kept as-is rather than reconciled onto
// the engine's shorter internal names.
export type OnboardingPersona = 'crush' | 'dating_new' | 'longterm' | 'healing';

const MODE_TO_ONBOARDING_PERSONA: Record<Mode, OnboardingPersona> = {
  crush: 'crush',
  new: 'dating_new',
  ltr: 'longterm',
  healing: 'healing',
};

export function modeToOnboardingPersona(mode: Mode): OnboardingPersona {
  return MODE_TO_ONBOARDING_PERSONA[mode];
}

export interface UserDoc {
  uid: string;
  displayName?: string;
  email?: string;
  createdAt: Timestamp;
  onboardingPersona: OnboardingPersona;
  notificationTime: string; // "HH:mm", 24h
  subscriptionTier: 'free' | 'premium_solo' | 'premium_couples';
  appName: 'GiveAll';
  partnerId?: string; // set only after double opt-in via /partnerships
  timezone: string; // IANA tz name
}

export type LoveLanguageKey = 'words' | 'acts' | 'touch' | 'quality_time' | 'gifts';

// attachmentScores: normalized 0.0-1.0, sums to 1.0 (validated by the
// validateProfile Cloud Function, tolerance +/-0.02 — see functions/src/validateProfile.ts).
// attachmentScoresRaw: unnormalized counts, kept for debugging/audit only —
// never read by product logic.
export interface ProfileDoc {
  userId: string;
  attachmentStyle: FirestoreAttachmentStyle;
  attachmentStyleDominant: FirestoreAttachmentStyle;
  attachmentScores: Record<FirestoreAttachmentStyle, number> & { _sum: number };
  attachmentScoresRaw: Record<FirestoreAttachmentStyle, number>;
  loveLanguageGive: LoveLanguageKey;
  loveLanguageReceive: LoveLanguageKey;
  loveLanguageWeights: Record<LoveLanguageKey, number>; // sums to ~1.0, EMA-updated nightly
  desireInventory: string[];
  notificationTime: string; // "HH:mm", 24h
  updatedAt: Timestamp;
}

export type MoodLabel =
  | 'hopeful'
  | 'joyful'
  | 'calm'
  | 'neutral'
  | 'anxious'
  | 'lonely'
  | 'disconnected'
  | 'triggered'
  | 'loved';

export interface DailyCheckinDoc {
  userId: string;
  date: string; // "YYYY-MM-DD"
  seen_score: number; // 1-10
  safe_score: number; // 1-10
  sought_score: number; // 1-10
  moodScore: number; // 1-10, queryable
  moodLabel: MoodLabel;
  contextTags: string[];
  bid_logged_today: boolean;
  createdAt: Timestamp;
  note?: string;
}

export type BidType = 'comment' | 'touch' | 'joke' | 'help';
export type BidResponseType = 'toward' | 'away' | 'against';

export interface BidDoc {
  userId: string;
  date: string; // "YYYY-MM-DD"
  bidDescription: string;
  bidType: BidType;
  response: BidResponseType;
  ratioWeekly: number; // % toward over trailing 7 days, denormalized for quick reads
  createdAt: Timestamp;
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
  // Denormalized from suggested_actions/{actionId} at write time so the
  // nightly recalibration job (functions/src/recalculateWeights.ts) can
  // group by language without an N+1 lookup per log entry.
  loveLanguageType: LoveLanguageKey;
  timestamp: Timestamp;
  partnerMoodDelta: -2 | -1 | 0 | 1 | 2; // self-reported
  wasCompleted: boolean;
  context?: string;
}

// Append-only audit trail for docs/02-love-os-brain.md #3's "never silently
// change loveLanguage" rule. functions/src/recalculateWeights.ts (nightly,
// not yet deployed) writes 'recalibrated'/'skipped_insufficient_logs' rows
// for its EMA-blended loveLanguageWeights; app/checkin.tsx writes
// 'client_recalibrated' rows for the simpler client-side primary-language
// swap (src/engine/recalibration.ts's checkRecalibration) — same collection,
// distinguishable by `type`, since both are the same audit concern.
export interface RecalibrationEventDoc {
  userId: string;
  type: 'client_recalibrated';
  previousLoveLanguageReceive: LoveLanguageKey;
  newLoveLanguageReceive: LoveLanguageKey;
  message: string;
  logCount: number;
  timestamp: Timestamp;
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
  type: 'photo' | 'joke' | 'detail' | 'interest';
  content: string;
  date: string; // "YYYY-MM-DD"
  sentiment: 'warm' | 'neutral' | 'tense';
  usedInGeneration: boolean;
}

// Persisted form of src/engine/types.ts's DesireInventoryEntry. Not in the
// original handoff — no schema/rules/collection helpers existed for this
// at all despite the engine (decisionMatrix.ts's "sought" axis) and
// docs/02-love-os-brain.md #2 depending on it; same class of gap as
// MemoryVaultDoc had before app/memory-vault.tsx was built.
export interface DesireInventoryDoc {
  userId: string;
  desire: string;
  rank: number; // 1 = most wanted; lower rank surfaces first
  used: boolean;
  createdAt: Timestamp;
}

export interface PartnershipDoc {
  users: [string, string]; // two uids, doc id is "{uidA}_{uidB}" sorted
  optIns: Record<string, boolean>; // uid -> has this participant opted in
  status: 'pending' | 'active' | 'blocked';
  createdAt: Timestamp;
}
