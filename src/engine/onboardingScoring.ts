import type { AttachmentStyle, LoveLanguage } from './types';

/** Tally attachment answers; returns primary style + secondary "spike" if present. */
export function tallyAttachment(answers: AttachmentStyle[]): {
  primary: AttachmentStyle;
  spike?: AttachmentStyle;
} {
  const counts: Record<AttachmentStyle, number> = {
    secure: 0,
    anxious: 0,
    avoidant: 0,
    fearful: 0,
  };
  for (const a of answers) counts[a] += 1;

  const ranked = (Object.entries(counts) as [AttachmentStyle, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const primary = ranked[0]?.[0] ?? 'secure';
  const spike = ranked[1] && ranked[1][1] >= 2 ? ranked[1][0] : undefined;

  return { primary, spike };
}

/** Tally love language forced-choice picks; returns primary + secondary. */
export function tallyLoveLanguage(picks: LoveLanguage[]): {
  primary: LoveLanguage;
  secondary: LoveLanguage;
} {
  const counts: Record<LoveLanguage, number> = {
    words: 0,
    acts: 0,
    gifts: 0,
    quality_time: 0,
    touch: 0,
  };
  for (const p of picks) counts[p] += 1;

  const ranked = (Object.entries(counts) as [LoveLanguage, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  return {
    primary: ranked[0][0],
    secondary: ranked[1][0],
  };
}

/** Copy for the Screen 5 payoff card — see docs/01-onboarding-flow.md. */
export function buildPayoffSummary(params: {
  primaryAttachment: AttachmentStyle;
  spikeAttachment?: AttachmentStyle;
  receivesVia: LoveLanguage;
  givesVia: LoveLanguage;
}): string {
  const styleLabel = (s: AttachmentStyle) => s[0].toUpperCase() + s.slice(1);
  const langLabel = (l: LoveLanguage) => (l === 'quality_time' ? 'Quality Time' : l[0].toUpperCase() + l.slice(1));

  const attachmentPhrase = params.spikeAttachment
    ? `${styleLabel(params.primaryAttachment)}-leaning with ${styleLabel(params.spikeAttachment)} spikes`
    : `${styleLabel(params.primaryAttachment)}-leaning`;

  return `Got it. You're ${attachmentPhrase}, and you feel most loved through ${langLabel(
    params.receivesVia,
  )}, but you SHOW love through ${langLabel(params.givesVia)}. That's why you feel unseen sometimes. Here's your first micro-adjustment...`;
}
