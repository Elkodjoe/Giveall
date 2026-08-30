import { checkRecalibration, toDailyFeedback } from '../recalibration';
import type { ActionLogEntry, DailyFeedback } from '../recalibration';

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

describe('toDailyFeedback', () => {
  function log(date: string, loveLanguageType: ActionLogEntry['loveLanguageType'], partnerMoodDelta: number): ActionLogEntry {
    return { date, loveLanguageType, partnerMoodDelta };
  }

  it('drops days where the action did not land', () => {
    const result = toDailyFeedback([log('2026-08-01', 'words', -1), log('2026-08-02', 'words', 0)]);
    expect(result).toEqual([]);
  });

  it('keeps one entry per day, using the first (most recent) write', () => {
    const result = toDailyFeedback([
      log('2026-08-02', 'words', 2),
      log('2026-08-02', 'acts', 1), // same day, later in the list — ignored
      log('2026-08-01', 'touch', 1),
    ]);
    expect(result).toEqual([
      { date: '2026-08-02', loveLanguageObserved: 'words' },
      { date: '2026-08-01', loveLanguageObserved: 'touch' },
    ]);
  });
});
