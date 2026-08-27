import { summarizeWeek, shouldTriggerRepairQuest } from '../bidTracker';
import type { BidLogEntry } from '../types';

function bid(daysAgo: number, response: BidLogEntry['response']): BidLogEntry {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id: `${daysAgo}-${response}`, description: 'test bid', response, date: d.toISOString() };
}

describe('summarizeWeek', () => {
  it('computes toward ratio and secure zone flag at 80% threshold', () => {
    const log = [bid(1, 'toward'), bid(2, 'toward'), bid(3, 'toward'), bid(4, 'toward'), bid(5, 'away')];
    const summary = summarizeWeek(log);
    expect(summary.total).toBe(5);
    expect(summary.towardRatio).toBeCloseTo(0.8);
    expect(summary.isSecureZone).toBe(true);
  });

  it('flags below-threshold weeks as not secure zone', () => {
    const log = [bid(1, 'toward'), bid(2, 'away'), bid(3, 'against')];
    const summary = summarizeWeek(log);
    expect(summary.isSecureZone).toBe(false);
    expect(shouldTriggerRepairQuest(summary)).toBe(true);
  });

  it('excludes bids older than 7 days', () => {
    const log = [bid(10, 'against')];
    const summary = summarizeWeek(log);
    expect(summary.total).toBe(0);
    expect(shouldTriggerRepairQuest(summary)).toBe(false);
  });
});
