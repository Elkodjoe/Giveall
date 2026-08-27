import type { AttachmentStyle, LoveLanguage } from '../engine/types';

export interface AttachmentQuestion {
  id: string;
  prompt: string;
  options: { label: string; style: AttachmentStyle }[];
}

// 6 scenario questions, not 36 — see docs/01-onboarding-flow.md Screen 3.
export const ATTACHMENT_QUESTIONS: AttachmentQuestion[] = [
  {
    id: 'aq-1',
    prompt: "When they don't text back for hours, you...",
    options: [
      { label: "Assume they're busy, check later", style: 'secure' },
      { label: 'Spiral and want to double-text', style: 'anxious' },
      { label: 'Feel relieved, need space', style: 'avoidant' },
      { label: 'Want closeness but fear bothering them', style: 'fearful' },
    ],
  },
  {
    id: 'aq-2',
    prompt: 'After a really good date or conversation, you...',
    options: [
      { label: 'Feel good and look forward to the next one', style: 'secure' },
      { label: 'Immediately worry it will fade or was too good to be true', style: 'anxious' },
      { label: 'Feel a small urge to pull back and take stock', style: 'avoidant' },
      { label: 'Feel happy but brace for it to go wrong somehow', style: 'fearful' },
    ],
  },
  {
    id: 'aq-3',
    prompt: 'When a conflict comes up, you...',
    options: [
      { label: 'Address it directly and expect it to get resolved', style: 'secure' },
      { label: 'Feel panicked and need it resolved right away', style: 'anxious' },
      { label: 'Want to withdraw until things cool down', style: 'avoidant' },
      { label: 'Want to fix it but freeze or say nothing', style: 'fearful' },
    ],
  },
  {
    id: 'aq-4',
    prompt: 'Your partner wants a weekend to themselves. You...',
    options: [
      { label: "Are fine with it, plan your own time", style: 'secure' },
      { label: 'Wonder if something is wrong between you', style: 'anxious' },
      { label: 'Feel relieved to have the space too', style: 'avoidant' },
      { label: 'Want to say it is fine but feel unsettled', style: 'fearful' },
    ],
  },
  {
    id: 'aq-5',
    prompt: 'Being told "I need you" by a partner makes you feel...',
    options: [
      { label: 'Good — closeness feels natural', style: 'secure' },
      { label: 'Relieved — this is what you wanted to hear', style: 'anxious' },
      { label: 'A little cornered or pressured', style: 'avoidant' },
      { label: 'Warm but also scared of letting them down', style: 'fearful' },
    ],
  },
  {
    id: 'aq-6',
    prompt: 'When you picture your ideal amount of closeness, it is...',
    options: [
      { label: 'Close but with room for independence, and that feels easy', style: 'secure' },
      { label: 'As close as possible, as often as possible', style: 'anxious' },
      { label: 'Independent first, closeness on your own terms', style: 'avoidant' },
      { label: 'You want it deeply but it also scares you', style: 'fearful' },
    ],
  },
];

export interface LoveLanguagePair {
  id: string;
  prompt: string;
  options: { label: string; language: LoveLanguage }[];
}

// 4 forced-choice pairs rotating through the 5 languages.
export const LOVE_LANGUAGE_PAIRS: LoveLanguagePair[] = [
  {
    id: 'll-1',
    prompt: 'Which would make you feel MORE loved after a hard day?',
    options: [
      { label: 'I handled that errand for you', language: 'acts' },
      { label: "You mean so much to me, I'm proud of you", language: 'words' },
    ],
  },
  {
    id: 'll-2',
    prompt: 'Which would make you feel MORE loved after a hard day?',
    options: [
      { label: 'A small gift that shows they were thinking of you', language: 'gifts' },
      { label: 'Twenty minutes of their full, undistracted attention', language: 'quality_time' },
    ],
  },
  {
    id: 'll-3',
    prompt: 'Which would make you feel MORE loved after a hard day?',
    options: [
      { label: 'A long hug, no words needed', language: 'touch' },
      { label: 'A text list of things they appreciate about you', language: 'words' },
    ],
  },
  {
    id: 'll-4',
    prompt: 'Which would make you feel MORE loved after a hard day?',
    options: [
      { label: 'They quietly took something off your plate', language: 'acts' },
      { label: 'They sat with you while you decompressed, no phones', language: 'quality_time' },
    ],
  },
];
