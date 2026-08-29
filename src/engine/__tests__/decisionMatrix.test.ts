import { getMicroAttunement, lowestAxis, resolveActionCopy } from '../decisionMatrix';
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

describe('resolveActionCopy', () => {
  it('falls back when there is no catalog entry', () => {
    expect(resolveActionCopy(undefined, 'fallback text', {})).toBe('fallback text');
  });

  it('uses catalog copy verbatim when it has no placeholders', () => {
    expect(resolveActionCopy('Ask directly tonight.', 'fallback', {})).toBe('Ask directly tonight.');
  });

  it('fills the memoryVaultDetail placeholder when available', () => {
    const result = resolveActionCopy(
      'Recall detail: Last week they mentioned {{memoryVaultDetail}}. Ask about it today.',
      'fallback',
      { memoryVaultDetail: 'their new project at work' },
    );
    expect(result).toBe('Recall detail: Last week they mentioned their new project at work. Ask about it today.');
  });

  it('falls back when memoryVaultDetail is needed but missing', () => {
    const result = resolveActionCopy(
      'Recall detail: Last week they mentioned {{memoryVaultDetail}}. Ask about it today.',
      'fallback text',
      {},
    );
    expect(result).toBe('fallback text');
  });

  it('fills the interest placeholder when available', () => {
    const result = resolveActionCopy(
      "Specific desire: 'I love how you light up when you talk about {{interest}}.'",
      'fallback',
      { interest: 'being defended in public' },
    );
    expect(result).toBe("Specific desire: 'I love how you light up when you talk about being defended in public.'");
  });

  it('falls back when interest is needed but missing', () => {
    expect(
      resolveActionCopy("Specific desire: '{{interest}}'", 'fallback text', {}),
    ).toBe('fallback text');
  });
});
