import {
  attachmentStyleToFirestore,
  attachmentStyleFromFirestore,
  modeToOnboardingPersona,
} from '../types';
import type { AttachmentStyle, Mode } from '../../engine/types';

describe('attachment style mapping', () => {
  const styles: AttachmentStyle[] = ['secure', 'anxious', 'avoidant', 'fearful'];

  it('round-trips every style through Firestore and back', () => {
    for (const style of styles) {
      expect(attachmentStyleFromFirestore(attachmentStyleToFirestore(style))).toBe(style);
    }
  });

  it('uses snake_case, not hyphens', () => {
    expect(attachmentStyleToFirestore('anxious')).toBe('anxious_preoccupied');
    expect(attachmentStyleToFirestore('avoidant')).toBe('dismissive_avoidant');
  });
});

describe('modeToOnboardingPersona', () => {
  it('maps every Mode to its OnboardingPersona spelling', () => {
    const cases: [Mode, string][] = [
      ['crush', 'crush'],
      ['new', 'dating_new'],
      ['ltr', 'longterm'],
      ['healing', 'healing'],
    ];
    for (const [mode, expected] of cases) {
      expect(modeToOnboardingPersona(mode)).toBe(expected);
    }
  });
});
