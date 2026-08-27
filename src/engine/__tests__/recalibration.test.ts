import { checkRecalibration } from '../recalibration';
import type { DailyFeedback } from '../recalibration';

function feedback(daysAgo: number, lang: DailyFeedback['loveLanguageObserved']): DailyFeedback {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { date: d.toISOString(), loveLanguageObserved: lang };
}

describe('checkRecalibration', () => {
  it('does not recalibrate with fewer than 5 days of data', () => {
    const feed = [feedback(0, 'words'), feedback(1, 'words')];
    expect(checkRecalibration('acts', feed).shouldRecalibrate).toBe(false);
  });

  it('recalibrates after a 5-day consistent contradicting streak', () => {
    const feed = [0, 1, 2, 3, 4].map((d) => feedback(d, 'words'));
    const result = checkRecalibration('acts', feed);
    expect(result.shouldRecalibrate).toBe(true);
    expect(result.newPrimary).toBe('words');
    expect(result.message).toContain('Words');
  });

  it('does not recalibrate when streak matches current primary', () => {
    const feed = [0, 1, 2, 3, 4].map((d) => feedback(d, 'acts'));
    expect(checkRecalibration('acts', feed).shouldRecalibrate).toBe(false);
  });

  it('does not recalibrate on a mixed streak', () => {
    const feed = [feedback(0, 'words'), feedback(1, 'words'), feedback(2, 'acts'), feedback(3, 'words'), feedback(4, 'words')];
    expect(checkRecalibration('acts', feed).shouldRecalibrate).toBe(false);
  });
});
