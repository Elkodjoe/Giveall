/**
 * Firestore's daily_checkins uses a 1-10 raw input scale (what a slider UI
 * shows the user); the client-side engine's AvwScores use 0-100 (see
 * types.ts). Nothing else converts between the two — always go through
 * these before mixing a Firestore-sourced value into engine logic, or vice
 * versa. See docs/00-product-overview.md.
 */

/** 1-10 raw input -> 0-100 engine score. toAvwScore(1) === 0, toAvwScore(10) === 100. */
export function toAvwScore(raw1to10: number): number {
  return ((raw1to10 - 1) / 9) * 100;
}

/** Inverse of toAvwScore: 0-100 engine score -> 1-10 raw input, for displaying an engine score back on a slider. */
export function fromAvwScore(score0to100: number): number {
  return (score0to100 / 100) * 9 + 1;
}
