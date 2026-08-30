import type { LoveLanguage } from './types';

export interface DailyFeedback {
  date: string; // ISO date
  loveLanguageObserved: LoveLanguage; // the language of the action the user rated highest that day
}

// Consecutive days of contradicting signal required before we overwrite the
// onboarding baseline. See docs/02-love-os-brain.md #3 — recalibration must
// never be silent; always pair a change with the "We learned..." message.
const RECALIBRATION_STREAK_THRESHOLD = 5;

export interface RecalibrationResult {
  shouldRecalibrate: boolean;
  newPrimary?: LoveLanguage;
}

/**
 * Checks the most recent feedback entries for a consistent contradiction of
 * the current primary love language. Pure function — caller persists the
 * change and logs it to the audit trail.
 */
export function checkRecalibration(
  currentPrimary: LoveLanguage,
  recentFeedback: DailyFeedback[],
): RecalibrationResult {
  const sorted = [...recentFeedback].sort((a, b) => (a.date < b.date ? 1 : -1));
  const streak = sorted.slice(0, RECALIBRATION_STREAK_THRESHOLD);

  if (streak.length < RECALIBRATION_STREAK_THRESHOLD) {
    return { shouldRecalibrate: false };
  }

  const candidate = streak[0].loveLanguageObserved;
  const isConsistentStreak =
    candidate !== currentPrimary && streak.every((f) => f.loveLanguageObserved === candidate);

  if (!isConsistentStreak) {
    return { shouldRecalibrate: false };
  }

  return { shouldRecalibrate: true, newPrimary: candidate };
}

export interface ActionLogEntry {
  date: string; // "YYYY-MM-DD" — caller converts the Firestore Timestamp
  loveLanguageType: LoveLanguage;
  partnerMoodDelta: number;
}

/**
 * Reduces raw action_logs entries to the DailyFeedback shape
 * checkRecalibration expects: one entry per calendar day (most recent
 * write for that day wins), counting only days where the action actually
 * landed (partnerMoodDelta > 0) — a rejected action isn't evidence the
 * user feels loved by that language. Pure, so it's testable without a
 * Firestore Timestamp in the loop.
 */
export function toDailyFeedback(logs: ActionLogEntry[]): DailyFeedback[] {
  const byDate = new Map<string, LoveLanguage>();
  for (const log of logs) {
    if (log.partnerMoodDelta <= 0) continue;
    if (!byDate.has(log.date)) byDate.set(log.date, log.loveLanguageType);
  }
  return Array.from(byDate.entries()).map(([date, loveLanguageObserved]) => ({ date, loveLanguageObserved }));
}
