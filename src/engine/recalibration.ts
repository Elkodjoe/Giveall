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
  message?: string;
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

  return {
    shouldRecalibrate: true,
    newPrimary: candidate,
    message: `We learned you feel more loved by ${labelFor(candidate)} than you thought. Adjusting your plan.`,
  };
}

function labelFor(lang: LoveLanguage): string {
  const labels: Record<LoveLanguage, string> = {
    words: 'Words',
    acts: 'Acts',
    gifts: 'Gifts',
    quality_time: 'Quality Time',
    touch: 'Touch',
  };
  return labels[lang];
}
