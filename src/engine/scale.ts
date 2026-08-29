import type { AvwScores } from './types';

/**
 * Firestore's daily_checkins uses a 1-10 raw input scale (what a slider UI
 * shows the user); the client-side engine's AvwScores use 0-100 (see
 * types.ts). Nothing else converts between the two — always go through
 * these before mixing a Firestore-sourced value into engine logic, or vice
 * versa. See docs/00-product-overview.md.
 *
 * Lives here (src/engine/) rather than a separate utils/ module since it's
 * framework-agnostic like the rest of the engine and only one file.
 */

export type CheckinScore = number; // 1-10 int
export type AvwScore = number; // 0-100 int

/** 1-10 raw input -> 0-100 engine score. toAvwScore(1) === 0, toAvwScore(10) === 100. */
export function toAvwScore(checkin: CheckinScore): AvwScore {
  const clamped = Math.max(1, Math.min(10, Math.round(checkin)));
  return Math.round((clamped - 1) * (100 / 9));
}

/** Inverse of toAvwScore: 0-100 engine score -> 1-10 raw input, for displaying an engine score back on a slider. */
export function toCheckinScore(avw: AvwScore): CheckinScore {
  const clamped = Math.max(0, Math.min(100, Math.round(avw)));
  return Math.max(1, Math.min(10, Math.round((clamped * 9) / 100 + 1)));
}

export function checkinToAvw(checkin: { seen_score: number; safe_score: number; sought_score: number }): AvwScores {
  return {
    seen: toAvwScore(checkin.seen_score),
    safe: toAvwScore(checkin.safe_score),
    sought: toAvwScore(checkin.sought_score),
  };
}

export function avwToCheckin(avw: AvwScores): { seen_score: number; safe_score: number; sought_score: number } {
  return {
    seen_score: toCheckinScore(avw.seen),
    safe_score: toCheckinScore(avw.safe),
    sought_score: toCheckinScore(avw.sought),
  };
}

export interface WeeklyCheckinAverage {
  seen_score: number;
  safe_score: number;
  sought_score: number;
  moodScore: number;
  daysLogged: number;
}

/** Averages a window of daily_checkins rows (already on the 1-10 raw scale). Returns null for an empty window rather than dividing by zero. */
export function averageCheckins(
  checkins: { seen_score: number; safe_score: number; sought_score: number; moodScore: number }[],
): WeeklyCheckinAverage | null {
  if (checkins.length === 0) return null;
  const sum = checkins.reduce(
    (acc, c) => ({
      seen_score: acc.seen_score + c.seen_score,
      safe_score: acc.safe_score + c.safe_score,
      sought_score: acc.sought_score + c.sought_score,
      moodScore: acc.moodScore + c.moodScore,
    }),
    { seen_score: 0, safe_score: 0, sought_score: 0, moodScore: 0 },
  );
  const n = checkins.length;
  const round1 = (total: number) => Math.round((total / n) * 10) / 10;
  return {
    seen_score: round1(sum.seen_score),
    safe_score: round1(sum.safe_score),
    sought_score: round1(sum.sought_score),
    moodScore: round1(sum.moodScore),
    daysLogged: n,
  };
}
