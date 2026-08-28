import { toAvwScore, toCheckinScore, checkinToAvw, avwToCheckin } from '../scale';

describe('toAvwScore', () => {
  it('maps the scale endpoints', () => {
    expect(toAvwScore(1)).toBe(0);
    expect(toAvwScore(10)).toBe(100);
  });

  it('clamps out-of-range input', () => {
    expect(toAvwScore(0)).toBe(0);
    expect(toAvwScore(11)).toBe(100);
  });

  it('is monotonically increasing', () => {
    expect(toAvwScore(3)).toBeLessThan(toAvwScore(7));
  });
});

describe('toCheckinScore', () => {
  it('maps the scale endpoints', () => {
    expect(toCheckinScore(0)).toBe(1);
    expect(toCheckinScore(100)).toBe(10);
  });

  it('clamps out-of-range input', () => {
    expect(toCheckinScore(-5)).toBe(1);
    expect(toCheckinScore(105)).toBe(10);
  });

  it('round-trips every integer 1-10 through toAvwScore', () => {
    for (let n = 1; n <= 10; n++) {
      expect(toCheckinScore(toAvwScore(n))).toBe(n);
    }
  });
});

describe('checkinToAvw / avwToCheckin', () => {
  it('converts a full daily checkin to AvwScores and back', () => {
    const checkin = { seen_score: 8, safe_score: 3, sought_score: 6 };
    const avw = checkinToAvw(checkin);
    expect(avw).toEqual({ seen: toAvwScore(8), safe: toAvwScore(3), sought: toAvwScore(6) });
    expect(avwToCheckin(avw)).toEqual(checkin);
  });
});
