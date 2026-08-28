import { toAvwScore, fromAvwScore } from '../scale';

describe('toAvwScore', () => {
  it('maps the scale endpoints', () => {
    expect(toAvwScore(1)).toBe(0);
    expect(toAvwScore(10)).toBe(100);
  });

  it('maps the midpoint', () => {
    expect(toAvwScore(5.5)).toBeCloseTo(50);
  });

  it('is monotonically increasing', () => {
    expect(toAvwScore(3)).toBeLessThan(toAvwScore(7));
  });
});

describe('fromAvwScore', () => {
  it('is the inverse of toAvwScore', () => {
    expect(fromAvwScore(0)).toBeCloseTo(1);
    expect(fromAvwScore(100)).toBeCloseTo(10);
    for (const raw of [1, 3.5, 7, 10]) {
      expect(fromAvwScore(toAvwScore(raw))).toBeCloseTo(raw);
    }
  });
});
