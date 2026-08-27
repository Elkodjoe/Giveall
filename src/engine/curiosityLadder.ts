export type CuriosityTier = 'gratitude_joy' | 'values_dreams' | 'vulnerability_repair';

export interface CuriosityCard {
  id: string;
  tier: CuriosityTier;
  prompt: string;
}

// ids and question text intentionally match scripts/seed/curiosity_cards.json
// (this is the canonical, offline copy for pre-Firebase/local use) — edit
// both if you change one. level 1/2/3 there maps to the three tiers here.
const CARDS: CuriosityCard[] = [
  // Weeks 1-4 (level 1)
  { id: 'cc_l1_01', tier: 'gratitude_joy', prompt: 'What moment made you feel most proud of us this week?' },
  { id: 'cc_l1_02', tier: 'gratitude_joy', prompt: "What's a small thing I do that you secretly love?" },
  { id: 'cc_l1_03', tier: 'gratitude_joy', prompt: 'When did you feel most seen by me recently?' },
  // Weeks 5-12 (level 2)
  { id: 'cc_l2_01', tier: 'values_dreams', prompt: "What's a hidden dream you've never told me?" },
  { id: 'cc_l2_02', tier: 'values_dreams', prompt: 'What does feeling safe mean to you in love?' },
  // Weeks 12+ (level 3)
  { id: 'cc_l3_01', tier: 'vulnerability_repair', prompt: "When do you feel most alone, even when I'm here?" },
  { id: 'cc_l3_02', tier: 'vulnerability_repair', prompt: "What's a story from your childhood that shaped how you love?" },
];

/**
 * Weeks are gated, never jumped early even with high engagement — the
 * ladder is a safety mechanism, not just a content schedule.
 */
export function tierForWeek(weeksSinceStart: number): CuriosityTier {
  if (weeksSinceStart < 5) return 'gratitude_joy';
  if (weeksSinceStart < 13) return 'values_dreams';
  return 'vulnerability_repair';
}

export function weeksSinceStart(startDate: string, asOfDate: Date = new Date()): number {
  const start = new Date(startDate);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((asOfDate.getTime() - start.getTime()) / msPerWeek));
}

/** Cards available for the user's current tier, in a fixed order. */
export function cardsForWeek(weeksSinceStart: number): CuriosityCard[] {
  const tier = tierForWeek(weeksSinceStart);
  return CARDS.filter((c) => c.tier === tier);
}

export function nextCard(weeksSinceStart: number, seenIds: string[]): CuriosityCard | undefined {
  return cardsForWeek(weeksSinceStart).find((c) => !seenIds.includes(c.id));
}
