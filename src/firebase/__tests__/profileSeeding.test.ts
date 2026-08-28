import { buildAttachmentScores, buildInitialLoveLanguageWeights, buildInitialProfile } from '../profileSeeding';
import { validateAttachmentScores } from '../attachmentScores';
import type { AttachmentStyle, LoveLanguage } from '../../engine/types';

describe('buildAttachmentScores', () => {
  it('normalizes counts to a distribution that sums to 1.0', () => {
    const answers: AttachmentStyle[] = ['secure', 'secure', 'anxious', 'avoidant'];
    const { scores, raw } = buildAttachmentScores(answers);
    expect(raw).toEqual({ secure: 2, anxious_preoccupied: 1, dismissive_avoidant: 1, fearful_avoidant: 0 });
    expect(scores.secure).toBeCloseTo(0.5);
    expect(validateAttachmentScores(scores)).toBe(true);
  });

  it('handles an empty answer list without dividing by zero', () => {
    const { scores } = buildAttachmentScores([]);
    expect(Number.isFinite(scores.secure)).toBe(true);
  });
});

describe('buildInitialLoveLanguageWeights', () => {
  it('gives the primary language 0.5 and splits the rest evenly', () => {
    const weights = buildInitialLoveLanguageWeights('words');
    expect(weights.words).toBeCloseTo(0.5);
    expect(weights.acts).toBeCloseTo(0.125);
    expect(weights.acts).toBe(weights.gifts);
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });
});

describe('buildInitialProfile', () => {
  it('derives a full ProfileDoc from onboarding answers', () => {
    const attachmentAnswers: AttachmentStyle[] = ['anxious', 'anxious', 'secure', 'anxious', 'secure', 'anxious'];
    const loveLanguagePicks: LoveLanguage[] = ['words', 'words', 'touch', 'quality_time'];

    const profile = buildInitialProfile({
      userId: 'u1',
      attachmentAnswers,
      loveLanguagePicks,
      notificationTime: '19:00',
    });

    expect(profile.attachmentStyle).toBe('anxious_preoccupied');
    expect(profile.attachmentStyleDominant).toBe('anxious_preoccupied');
    expect(profile.loveLanguageReceive).toBe('words');
    expect(profile.loveLanguageWeights.words).toBeCloseTo(0.5);
    expect(profile.desireInventory).toEqual([]);
    expect(profile.userId).toBe('u1');
  });
});
