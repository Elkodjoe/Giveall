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
// content-managed catalog the same copy was seeded from. strategyKey/actionKey
// resolve into src/i18n/locales/*.json's checkin.strategy/checkin.action.
const SAFE_SCORE_STRATEGY: Record<
  AttachmentStyle,
  { strategyKey: string; actionKey: string; loveLanguageType: LoveLanguage; actionId: string }
> = {
  anxious: {
    strategyKey: 'consistencyReassurance',
    actionKey: 'consistencyReassurance',
    loveLanguageType: 'words',
    actionId: 'act_words_001',
  },
  avoidant: {
    strategyKey: 'lowPressureSpace',
    actionKey: 'lowPressureSpace',
    loveLanguageType: 'quality_time',
    actionId: 'act_space_001',
  },
  fearful: {
    strategyKey: 'safeVulnerability',
    actionKey: 'safeVulnerability',
    loveLanguageType: 'words',
    actionId: 'act_vuln_001',
  },
  secure: {
    strategyKey: 'directRepair',
    actionKey: 'directRepair',
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
    const { strategyKey, actionKey, loveLanguageType, actionId } = SAFE_SCORE_STRATEGY[profile.attachmentStyle];
    return { axis, strategyKey, actionKey, loveLanguageType, actionId };
  }

  if (axis === 'seen') {
    const entry = nextUnused(profile.memoryVault);
    return {
      axis,
      strategyKey: 'recallDetail',
      actionKey: entry ? 'recallDetailWithEntry' : 'recallDetailGeneric',
      actionParams: entry ? { detail: entry.detail } : undefined,
      loveLanguageType: 'quality_time',
      actionId: 'act_seen_001',
    };
  }

  // axis === 'sought'
  const entry = nextUnused(profile.desireInventory);
  return {
    axis,
    strategyKey: 'specificDesirePlay',
    actionKey: entry ? 'specificDesireWithEntry' : 'specificDesireGeneric',
    actionParams: entry ? { desire: entry.desire } : undefined,
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
