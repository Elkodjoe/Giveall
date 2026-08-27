export type CuriosityTier = 'gratitude_joy' | 'values_dreams' | 'vulnerability_repair';

export interface CuriosityCard {
  id: string;
  tier: CuriosityTier;
  prompt: string;
}

const CARDS: CuriosityCard[] = [
  // Weeks 1-4
  { id: 'gj-1', tier: 'gratitude_joy', prompt: 'What moment made you proud of us this week?' },
  { id: 'gj-2', tier: 'gratitude_joy', prompt: 'What made you laugh together recently?' },
  { id: 'gj-3', tier: 'gratitude_joy', prompt: 'What small thing did they do that you appreciated but never said out loud?' },
  // Weeks 5-12
  { id: 'vd-1', tier: 'values_dreams', prompt: "What's a hidden dream you've never told me?" },
  { id: 'vd-2', tier: 'values_dreams', prompt: 'What does a great life look like to you in 10 years?' },
  { id: 'vd-3', tier: 'values_dreams', prompt: 'What value do you hope we never compromise on?' },
  // Weeks 12+
  { id: 'vr-1', tier: 'vulnerability_repair', prompt: 'When do you feel most alone, even when I\'m here?' },
  { id: 'vr-2', tier: 'vulnerability_repair', prompt: 'What\'s something you\'re afraid to ask me for?' },
  { id: 'vr-3', tier: 'vulnerability_repair', prompt: 'What repair, if any, still feels unfinished between us?' },
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
