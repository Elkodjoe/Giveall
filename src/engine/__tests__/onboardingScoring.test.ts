import { tallyAttachment, tallyLoveLanguage } from '../onboardingScoring';
import type { AttachmentStyle, LoveLanguage } from '../types';

describe('tallyAttachment', () => {
  it('picks the clear majority as primary, with no spike', () => {
    const answers: AttachmentStyle[] = ['secure', 'secure', 'secure', 'secure', 'anxious', 'avoidant'];
    expect(tallyAttachment(answers)).toEqual({ primary: 'secure', spike: undefined });
  });

  it('reports a spike when the secondary style has 2+ answers', () => {
    const answers: AttachmentStyle[] = ['anxious', 'anxious', 'anxious', 'avoidant', 'avoidant', 'secure'];
    expect(tallyAttachment(answers)).toEqual({ primary: 'anxious', spike: 'avoidant' });
  });

  it('does not report a spike for a single stray answer in the secondary style', () => {
    const answers: AttachmentStyle[] = ['secure', 'secure', 'secure', 'secure', 'secure', 'fearful'];
    expect(tallyAttachment(answers)).toEqual({ primary: 'secure', spike: undefined });
  });

  it('breaks a tie for primary deterministically (secure > anxious > avoidant > fearful)', () => {
    const answers: AttachmentStyle[] = ['secure', 'secure', 'secure', 'anxious', 'anxious', 'anxious'];
    expect(tallyAttachment(answers).primary).toBe('secure');
  });

  it('breaks a tie between avoidant and fearful the same way', () => {
    const answers: AttachmentStyle[] = ['avoidant', 'avoidant', 'avoidant', 'fearful', 'fearful', 'fearful'];
    expect(tallyAttachment(answers).primary).toBe('avoidant');
  });

  it('falls back to secure for an empty answer set', () => {
    expect(tallyAttachment([])).toEqual({ primary: 'secure', spike: undefined });
  });

  it('never returns the primary style as its own spike', () => {
    const answers: AttachmentStyle[] = ['fearful', 'fearful', 'fearful', 'fearful', 'fearful', 'fearful'];
    expect(tallyAttachment(answers)).toEqual({ primary: 'fearful', spike: undefined });
  });
});

describe('tallyLoveLanguage', () => {
  it('picks the clear majority as primary, runner-up as secondary', () => {
    const picks: LoveLanguage[] = ['words', 'words', 'words', 'acts', 'acts', 'gifts'];
    expect(tallyLoveLanguage(picks)).toEqual({ primary: 'words', secondary: 'acts' });
  });

  it('breaks a tie deterministically in words > acts > gifts > quality_time > touch order', () => {
    const picks: LoveLanguage[] = ['touch', 'touch', 'words', 'words'];
    expect(tallyLoveLanguage(picks).primary).toBe('words');
  });

  it('breaks a tie between quality_time and touch the same way', () => {
    const picks: LoveLanguage[] = ['touch', 'touch', 'quality_time', 'quality_time'];
    expect(tallyLoveLanguage(picks).primary).toBe('quality_time');
  });
});
