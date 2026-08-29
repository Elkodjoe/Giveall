import { tierForWeek, cardsForWeek, levelForTier } from '../curiosityLadder';

describe('curiosity ladder', () => {
  it('stays on gratitude_joy for weeks 1-4', () => {
    expect(tierForWeek(0)).toBe('gratitude_joy');
    expect(tierForWeek(4)).toBe('gratitude_joy');
  });

  it('moves to values_dreams for weeks 5-12', () => {
    expect(tierForWeek(5)).toBe('values_dreams');
    expect(tierForWeek(12)).toBe('values_dreams');
  });

  it('moves to vulnerability_repair after week 12', () => {
    expect(tierForWeek(13)).toBe('vulnerability_repair');
  });

  it('never returns cards from a later tier early', () => {
    const cards = cardsForWeek(2);
    expect(cards.every((c) => c.tier === 'gratitude_joy')).toBe(true);
  });
});

describe('levelForTier', () => {
  it('maps each tier to its curiosity_cards.json level', () => {
    expect(levelForTier('gratitude_joy')).toBe(1);
    expect(levelForTier('values_dreams')).toBe(2);
    expect(levelForTier('vulnerability_repair')).toBe(3);
  });
});
