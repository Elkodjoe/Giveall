import type { BidLogEntry } from './types';

export interface BidWeekSummary {
  towardCount: number;
  awayCount: number;
  againstCount: number;
  total: number;
  towardRatio: number; // 0-1
  isSecureZone: boolean; // ratio >= threshold
}

// Deliberately friendlier than Gottman's 86% masters/33% disasters split
// for married couples — tunable, not gospel. See docs/02-love-os-brain.md.
export const SECURE_ZONE_THRESHOLD = 0.8;

/** Bids within the last 7 days of `asOfDate` (inclusive), most recent first. */
export function bidsInLastWeek(bidLog: BidLogEntry[], asOfDate: Date = new Date()): BidLogEntry[] {
  const cutoff = new Date(asOfDate);
  cutoff.setDate(cutoff.getDate() - 7);
  return bidLog.filter((b) => new Date(b.date) >= cutoff && new Date(b.date) <= asOfDate);
}

export function summarizeWeek(
  bidLog: BidLogEntry[],
  asOfDate: Date = new Date(),
): BidWeekSummary {
  const week = bidsInLastWeek(bidLog, asOfDate);
  const towardCount = week.filter((b) => b.response === 'toward').length;
  const awayCount = week.filter((b) => b.response === 'away').length;
  const againstCount = week.filter((b) => b.response === 'against').length;
  const total = week.length;
  const towardRatio = total === 0 ? 0 : towardCount / total;

  return {
    towardCount,
    awayCount,
    againstCount,
    total,
    towardRatio,
    isSecureZone: towardRatio >= SECURE_ZONE_THRESHOLD,
  };
}

/** True when the weekly ratio drops below threshold and should trigger a
 * Curiosity Card + Appreciation quest (see docs/02-love-os-brain.md #4). */
export function shouldTriggerRepairQuest(summary: BidWeekSummary): boolean {
  return summary.total > 0 && !summary.isSecureZone;
}
