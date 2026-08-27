import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AttachmentStyle, LoveLanguage, Mode } from '../engine/types';

interface OnboardingState {
  mode?: Mode;
  attachmentAnswers: AttachmentStyle[];
  loveLanguagePicks: LoveLanguage[];
  ritualTime?: string;
}

interface OnboardingContextValue extends OnboardingState {
  setMode: (mode: Mode) => void;
  addAttachmentAnswer: (style: AttachmentStyle) => void;
  addLoveLanguagePick: (language: LoveLanguage) => void;
  setRitualTime: (time: string) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    attachmentAnswers: [],
    loveLanguagePicks: [],
  });

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ...state,
      setMode: (mode) => setState((s) => ({ ...s, mode })),
      addAttachmentAnswer: (style) =>
        setState((s) => ({ ...s, attachmentAnswers: [...s.attachmentAnswers, style] })),
      addLoveLanguagePick: (language) =>
        setState((s) => ({ ...s, loveLanguagePicks: [...s.loveLanguagePicks, language] })),
      setRitualTime: (time) => setState((s) => ({ ...s, ritualTime: time })),
    }),
    [state],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
