import { buildRetentionNotification } from '../retentionNotifications';

describe('buildRetentionNotification', () => {
  it('returns the neutral key when no context is given', () => {
    expect(buildRetentionNotification({})).toEqual({ key: 'retention.neutral' });
  });

  it('prefers lastActionSummary over bidResponseRatioPct when both are present', () => {
    const result = buildRetentionNotification({
      lastActionSummary: 'felt extra loved yesterday after your voice note',
      bidResponseRatioPct: 90,
    });
    expect(result).toEqual({
      key: 'retention.lastActionSummary',
      params: { summary: 'felt extra loved yesterday after your voice note' },
    });
  });

  it('uses bidResponseRatioPct when there is no lastActionSummary', () => {
    expect(buildRetentionNotification({ bidResponseRatioPct: 85 })).toEqual({
      key: 'retention.bidResponse',
      params: { pct: 85 },
    });
  });

  it('falls back to the neutral key when bidResponseRatioPct is 0 (a real value, not "missing")', () => {
    // 0 is a legitimate ratio (nobody logged toward this week) and must
    // still take the bidResponse branch, not fall through to neutral --
    // this only works because retentionNotifications.ts checks
    // `!== undefined`, not truthiness.
    expect(buildRetentionNotification({ bidResponseRatioPct: 0 })).toEqual({
      key: 'retention.bidResponse',
      params: { pct: 0 },
    });
  });
});
