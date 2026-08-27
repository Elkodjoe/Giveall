import type {
  AttachmentStyle,
  AvwAxis,
  AvwScores,
  DesireInventoryEntry,
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

const SAFE_SCORE_STRATEGY: Record<
  AttachmentStyle,
  { strategy: string; tone: string; action: string }
> = {
  anxious: {
    strategy: 'Consistency + Reassurance',
    tone: 'warm, predictable',
    action: "Morning voice note, same time daily: 'Thinking of you before your meeting'",
  },
  avoidant: {
    strategy: 'Low-Pressure Space',
    tone: 'light, no demand for reply',
    action: "No-reply-needed check-in: 'Saw this meme and thought of you, no need to reply'",
  },
  fearful: {
    strategy: 'Safe Vulnerability',
    tone: 'small, controlled share',
    action: 'Share one small worry first, then appreciation. Shows it’s safe to be vulnerable.',
  },
  secure: {
    strategy: 'Direct Repair',
    tone: 'plain, direct',
    action: "Ask directly: 'I felt a bit distant yesterday, can we reset tonight?'",
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
    const { strategy, tone, action } = SAFE_SCORE_STRATEGY[profile.attachmentStyle];
    return { axis, strategy, tone, action };
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
  };
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
