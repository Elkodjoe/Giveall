import type {
  AttachmentStyle,
  AvwAxis,
  AvwScores,
  DesireInventoryEntry,
  LoveLanguage,
  MemoryVaultEntry,
  MicroAttunement,
  UserProfile,
} from './types';

// Priority order used to break ties between equally-low scores.
// Safety is foundational; you can't feel truly seen or sought without it.
const TIE_BREAK_ORDER: AvwAxis[] = ['safe', 'seen', 'sought'];

/** The AVW axis with the lowest score today; ties broken by TIE_BREAK_ORDER. */
export function lowestAxis(scores: AvwScores): AvwAxis {
  const min = Math.min(scores.safe, scores.seen, scores.sought);
  const tied = TIE_BREAK_ORDER.filter((axis) => scores[axis] === min);
  return tied[0];
}

// loveLanguageType per branch matches scripts/seed/suggested_actions.json's
// equivalent trigger (act_words_001, act_space_001, act_vuln_001,
// act_direct_001) — same prescriptions, kept in sync by hand since this path
// runs client-side with zero Firestore reads while suggested_actions is the
// content-managed catalog the same copy was seeded from.
const SAFE_SCORE_STRATEGY: Record<
  AttachmentStyle,
  { strategy: string; tone: string; action: string; loveLanguageType: LoveLanguage; actionId: string }
> = {
  anxious: {
    strategy: 'Consistency + Reassurance',
    tone: 'warm, predictable',
    action: "Morning voice note, same time daily: 'Thinking of you before your meeting'",
    loveLanguageType: 'words',
    actionId: 'act_words_001',
  },
  avoidant: {
    strategy: 'Low-Pressure Space',
    tone: 'light, no demand for reply',
    action: "No-reply-needed check-in: 'Saw this meme and thought of you, no need to reply'",
    loveLanguageType: 'quality_time',
    actionId: 'act_space_001',
  },
  fearful: {
    strategy: 'Safe Vulnerability',
    tone: 'small, controlled share',
    action: 'Share one small worry first, then appreciation. Shows it’s safe to be vulnerable.',
    loveLanguageType: 'words',
    actionId: 'act_vuln_001',
  },
  secure: {
    strategy: 'Direct Repair',
    tone: 'plain, direct',
    action: "Ask directly: 'I felt a bit distant yesterday, can we reset tonight?'",
    loveLanguageType: 'words',
    actionId: 'act_direct_001',
  },
};

function nextUnused<T extends { used: boolean }>(entries: T[]): T | undefined {
  return entries.find((e) => !e.used);
}

/**
 * Core Micro-Attunement decision: given the user's profile, produce today's
 * single prescribed action. Pure function — no I/O, no side effects. Callers
 * are responsible for marking the returned Memory Vault / Desire Inventory
 * entry as `used` once the action is shown.
 */
export function getMicroAttunement(profile: UserProfile): MicroAttunement {
  const axis = lowestAxis(profile.avwScores);

  if (axis === 'safe') {
    const { strategy, tone, action, loveLanguageType, actionId } = SAFE_SCORE_STRATEGY[profile.attachmentStyle];
    return { axis, strategy, tone, action, loveLanguageType, actionId };
  }

  if (axis === 'seen') {
    const entry = nextUnused(profile.memoryVault);
    const action = entry
      ? `Last time they mentioned "${entry.detail}". Ask about it today.`
      : 'Ask an open question about something they care about, and really listen for a detail to remember.';
    return {
      axis,
      strategy: 'Recall Detail',
      tone: 'curious, attentive',
      action,
      loveLanguageType: 'quality_time',
      actionId: 'act_seen_001',
    };
  }

  // axis === 'sought'
  const entry = nextUnused(profile.desireInventory);
  const action = entry
    ? `They said "${entry.desire}" makes them feel wanted. Do that today.`
    : 'Do one small, specific thing that shows you chose them on purpose today.';
  return {
    axis,
    strategy: 'Specific Desire + Play',
    tone: 'playful, intentional',
    action,
    loveLanguageType: 'words',
    actionId: 'act_wanted_001',
  };
}

/**
 * Joins a MicroAttunement's actionId against the content-managed
 * suggested_actions catalog (scripts/seed/suggested_actions.json,
 * fetched via getSuggestedActions() in src/firebase/collections.ts) and
 * resolves the copy actually shown. Prefers the catalog's `copy` when its
 * `{{placeholder}}` can be filled with real personalization data;
 * otherwise falls back to the engine's own hardcoded `fallback` text —
 * covers offline, Firebase-not-configured, missing seed data, or a
 * placeholder with nothing to fill it. Pure — takes plain strings, not a
 * Firestore doc type, so this file stays framework-agnostic; the caller
 * does the actionId lookup against its fetched catalog.
 */
export function resolveActionCopy(
  catalogCopy: string | undefined,
  fallback: string,
  vars: { memoryVaultDetail?: string; interest?: string },
): string {
  if (!catalogCopy) return fallback;
  let text = catalogCopy;
  if (text.includes('{{memoryVaultDetail}}')) {
    if (!vars.memoryVaultDetail) return fallback;
    text = text.split('{{memoryVaultDetail}}').join(vars.memoryVaultDetail);
  }
  if (text.includes('{{interest}}')) {
    if (!vars.interest) return fallback;
    text = text.split('{{interest}}').join(vars.interest);
  }
  return text;
}

export function markMemoryVaultEntryUsed(
  entries: MemoryVaultEntry[],
  id: string,
): MemoryVaultEntry[] {
  return entries.map((e) => (e.id === id ? { ...e, used: true } : e));
}

export function markDesireInventoryEntryUsed(
  entries: DesireInventoryEntry[],
  id: string,
): DesireInventoryEntry[] {
  return entries.map((e) => (e.id === id ? { ...e, used: true } : e));
}
