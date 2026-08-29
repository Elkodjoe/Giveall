import { getMicroAttunement, lowestAxis } from '../decisionMatrix';
import type { UserProfile } from '../types';

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    mode: 'ltr',
    attachmentStyle: 'anxious',
    loveLanguagePrimary: 'words',
    loveLanguageSecondary: 'acts',
    avwScores: { safe: 80, seen: 80, sought: 80 },
    memoryVault: [],
    desireInventory: [],
    bidLog: [],
    startDate: '2026-01-01',
    ...overrides,
  };
}

describe('lowestAxis', () => {
  it('picks the lowest score', () => {
    expect(lowestAxis({ safe: 50, seen: 80, sought: 90 })).toBe('safe');
  });

  it('breaks ties as safe > seen > sought', () => {
    expect(lowestAxis({ safe: 50, seen: 50, sought: 90 })).toBe('safe');
    expect(lowestAxis({ safe: 90, seen: 50, sought: 50 })).toBe('seen');
  });
});

describe('getMicroAttunement', () => {
  it('recommends Consistency + Reassurance for low safe_score + anxious', () => {
    const profile = baseProfile({
      attachmentStyle: 'anxious',
      avwScores: { safe: 20, seen: 80, sought: 80 },
    });
    const result = getMicroAttunement(profile);
    expect(result.axis).toBe('safe');
    expect(result.strategy).toBe('Consistency + Reassurance');
    expect(result.loveLanguageType).toBe('words');
  });

  it('recommends Low-Pressure Space for low safe_score + avoidant', () => {
    const profile = baseProfile({
      attachmentStyle: 'avoidant',
      avwScores: { safe: 20, seen: 80, sought: 80 },
    });
    expect(getMicroAttunement(profile).strategy).toBe('Low-Pressure Space');
  });

  it('recommends Recall Detail for low seen_score regardless of attachment style', () => {
    const profile = baseProfile({
      attachmentStyle: 'secure',
      avwScores: { safe: 80, seen: 20, sought: 80 },
      memoryVault: [{ id: '1', detail: 'their new project at work', date: '2026-01-01', tags: [], used: false }],
    });
    const result = getMicroAttunement(profile);
    expect(result.axis).toBe('seen');
    expect(result.strategy).toBe('Recall Detail');
    expect(result.action).toContain('their new project at work');
    expect(result.loveLanguageType).toBe('quality_time');
  });

  it('recommends Specific Desire + Play for low sought_score regardless of attachment style', () => {
    const profile = baseProfile({
      attachmentStyle: 'fearful',
      avwScores: { safe: 80, seen: 80, sought: 20 },
      desireInventory: [{ id: '1', desire: 'being defended in public', rank: 1, used: false }],
    });
    const result = getMicroAttunement(profile);
    expect(result.axis).toBe('sought');
    expect(result.action).toContain('being defended in public');
    expect(result.loveLanguageType).toBe('words');
  });
});
