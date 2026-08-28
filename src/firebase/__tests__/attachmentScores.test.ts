import { validateAttachmentScores } from '../attachmentScores';

function scores(overrides: Partial<Parameters<typeof validateAttachmentScores>[0]> = {}) {
  return {
    secure: 0.45,
    anxious_preoccupied: 0.3,
    dismissive_avoidant: 0.15,
    fearful_avoidant: 0.1,
    _sum: 1.0,
    ...overrides,
  };
}

describe('validateAttachmentScores', () => {
  it('accepts a correctly normalized distribution', () => {
    expect(validateAttachmentScores(scores())).toBe(true);
  });

  it('rejects when the components do not actually sum to 1.0', () => {
    expect(validateAttachmentScores(scores({ secure: 0.9 }))).toBe(false);
  });

  it('rejects when _sum disagrees with the computed sum even if components are fine', () => {
    expect(validateAttachmentScores(scores({ _sum: 0.5 }))).toBe(false);
  });

  it('tolerates drift within +/-0.02', () => {
    expect(validateAttachmentScores(scores({ secure: 0.46, _sum: 1.01 }))).toBe(true);
  });
});
