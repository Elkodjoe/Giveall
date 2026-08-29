import { nextOccurrence } from '../nextOccurrence';

describe('nextOccurrence', () => {
  it('returns later today when the time has not passed yet', () => {
    const now = new Date('2026-08-29T10:00:00');
    const result = nextOccurrence(19, 0, now);
    expect(result.getDate()).toBe(29);
    expect(result.getHours()).toBe(19);
    expect(result.getMinutes()).toBe(0);
  });

  it('rolls over to tomorrow when the time has already passed', () => {
    const now = new Date('2026-08-29T20:00:00');
    const result = nextOccurrence(19, 0, now);
    expect(result.getDate()).toBe(30);
    expect(result.getHours()).toBe(19);
  });

  it('rolls over to tomorrow when the time is exactly now', () => {
    const now = new Date('2026-08-29T19:00:00');
    const result = nextOccurrence(19, 0, now);
    expect(result.getDate()).toBe(30);
  });
});
