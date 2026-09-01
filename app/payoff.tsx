import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import { useAuth } from '../src/state/AuthContext';
import { tallyAttachment, tallyLoveLanguage } from '../src/engine/onboardingScoring';
import { isFirebaseConfigured } from '../src/firebase/config';
import { generateAppreciation } from '../src/firebase/appreciationClient';
import {
  generateAppreciationViaProxy,
  isAppreciationProxyConfigured,
} from '../src/llm/appreciationProxyClient';
import { generateAppreciationViaOllama } from '../src/llm/ollamaClient';
import { isSpeechConfigured, speechUrlFor } from '../src/llm/speechClient';
import { logAction } from '../src/firebase/collections';
import { colors, radius, button, card, fontFamily } from '../src/theme/tokens';

// Screen 5 — The Payoff Preview. The Aha Moment: value delivered before any
// ask. Renders the translated fallback instantly (this screen must never
// feel like it's waiting on a network call), then tries two live sources in
// the background and silently swaps in whichever succeeds first — no
// loading spinner, no error shown if all fail, just stays on the fallback:
//   1. generateAppreciation() — the Cloud Function (functions/src/generateAppreciation.ts,
//      Anthropic/OpenAI). Only if the Blaze plan is enabled and it's deployed.
//   2. generateAppreciationViaProxy() — the Cloudflare Worker (proxy/), which
//      holds the LLM key server-side with no Blaze plan. The production path
//      once EXPO_PUBLIC_APPRECIATION_PROXY_URL is set; works from a real device.
//   3. generateAppreciationViaOllama() — a locally running Ollama server, a
//      dev-only stand-in. Only works on the same machine as `ollama serve`.
// generatedFirstWin stays null (falling back to the translated line, which
// reacts live to language switches) until a real LLM result lands — once
// generated in whatever language the prompt produced, it doesn't retroactively
// re-translate itself just because the user changes the app's language.
const GENERIC_SEED_COMPLIMENT = 'You are wonderful.';

export default function PayoffScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { attachmentAnswers, loveLanguagePicks } = useOnboarding();
  const { uid } = useAuth();
  const [generatedFirstWin, setGeneratedFirstWin] = useState<string | null>(null);
  const firstWin = generatedFirstWin ?? t('payoff.firstWinFallback');

  const { summary, receivesVia } = useMemo(() => {
    const { primary, spike } = tallyAttachment(attachmentAnswers);
    const { primary: receivesVia, secondary: givesVia } = tallyLoveLanguage(loveLanguagePicks);
    const attachmentPhrase = spike
      ? t('payoff.attachmentSpike', { primary: t(`attachmentStyles.${primary}`), spike: t(`attachmentStyles.${spike}`) })
      : t('payoff.attachmentNoSpike', { primary: t(`attachmentStyles.${primary}`) });
    return {
      receivesVia,
      summary: t('payoff.summary', {
        attachmentPhrase,
        receivesVia: t(`loveLanguages.${receivesVia}`),
        givesVia: t(`loveLanguages.${givesVia}`),
      }),
    };
  }, [attachmentAnswers, loveLanguagePicks, t]);

  useEffect(() => {
    let cancelled = false;
    const input = { genericCompliment: GENERIC_SEED_COMPLIMENT, loveLanguage: receivesVia };

    const tryCloudFunction = isFirebaseConfigured
      ? generateAppreciation(input)
      : Promise.reject(new Error('Firebase not configured'));

    tryCloudFunction
      .catch(() =>
        isAppreciationProxyConfigured()
          ? generateAppreciationViaProxy(input)
          : Promise.reject(new Error('Appreciation proxy not configured')),
      )
      .catch(() => generateAppreciationViaOllama(input))
      .then((result) => {
        if (!cancelled) setGeneratedFirstWin(result.text);
      })
      .catch(() => {
        // No source available (Cloud Function not deployed, no proxy URL
        // configured, no Ollama server reachable) — stays on the translated
        // fallback line, no error surfaced.
      });

    return () => {
      cancelled = true;
    };
  }, [receivesVia]);

  // "Hear it" — plays the shown appreciation line via the proxy's /speak
  // route (ElevenLabs TTS, key server-side). Best-effort: the button only
  // shows when the proxy URL is configured, and any failure just resets to
  // idle with no error surfaced, same as the rest of this screen.
  const soundRef = useRef<Audio.Sound | null>(null);
  const [speechState, setSpeechState] = useState<'idle' | 'loading' | 'playing'>('idle');

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, []);

  const playFirstWin = async () => {
    if (speechState !== 'idle') return;
    const uri = speechUrlFor(firstWin);
    if (!uri) return;
    setSpeechState('loading');
    try {
      await soundRef.current?.unloadAsync().catch(() => undefined);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setSpeechState('idle');
            sound.unloadAsync().catch(() => undefined);
          }
        },
      );
      soundRef.current = sound;
      setSpeechState('playing');
    } catch {
      setSpeechState('idle');
    }
  };

  // Both CTAs persist the shown line to action_logs — docs/01-onboarding-flow.md
  // Screen 5 calls this "instant value delivered before any ask", but until
  // now neither button did anything besides navigate on, discarding the
  // generated (or fallback) appreciation the moment the user left the screen.
  const persistFirstWin = async () => {
    if (!isFirebaseConfigured || !uid) return;
    try {
      await logAction({
        userId: uid,
        actionId: 'payoff_first_win',
        loveLanguageType: receivesVia,
        partnerMoodDelta: 0, // no reaction data exists yet at this point in the funnel
        wasCompleted: true,
        context: firstWin,
      });
    } catch {
      // best-effort; never blocks onboarding from continuing
    }
  };

  const handleSave = async () => {
    await persistFirstWin();
    router.push('/ritual-time');
  };

  const handleSend = async () => {
    try {
      await Share.share({ message: firstWin });
    } catch {
      // user cancelled, or Share is unsupported on this platform (e.g. web
      // without navigator.share) — the line is still saved below either way
    }
    await persistFirstWin();
    router.push('/ritual-time');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={4} total={4} />
      <Text style={styles.summary}>{summary}</Text>

      <View style={styles.winCardWrapper}>
        <View style={styles.winCard}>
          <Text style={styles.winLabel}>{t('payoff.firstWinLabel')}</Text>
          <Text style={styles.winSubLabel}>{t('payoff.firstWinSubLabel')}</Text>
          <Text style={styles.winText}>"{firstWin}"</Text>
          {isSpeechConfigured() && (
            <Pressable
              style={styles.hearButton}
              onPress={playFirstWin}
              disabled={speechState !== 'idle'}
              accessibilityRole="button"
              accessibilityLabel={t('payoff.hearIt')}
            >
              <Text style={styles.hearButtonLabel}>
                {speechState === 'idle' ? t('payoff.hearIt') : t('payoff.playing')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Pressable style={styles.ctaSecondary} onPress={handleSave} accessibilityRole="button">
          <Text style={styles.ctaSecondaryLabel}>{t('payoff.saveIt')}</Text>
        </Pressable>
        <Pressable style={styles.ctaPrimary} onPress={handleSend} accessibilityRole="button">
          <Text style={styles.ctaPrimaryLabel}>{t('payoff.sendIt')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  summary: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 18, lineHeight: 26, marginBottom: 24 },
  // Sized to content, not flex:1 — previously stretched to fill all
  // remaining screen height, leaving a large dead-looking empty gap below
  // the appreciation text on the "Aha moment" screen. winCardWrapper below
  // centers it in the space between the summary and the CTA row instead.
  winCardWrapper: { flex: 1, justifyContent: 'center' },
  winCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 24,
    ...card.shadow,
  },
  winLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  winSubLabel: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 15, marginTop: 4, marginBottom: 16 },
  winText: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 20, lineHeight: 28, fontStyle: 'italic' },
  hearButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  hearButtonLabel: { fontFamily: fontFamily.semiBold, color: colors.primary, fontSize: 14 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  ctaSecondary: {
    flex: 1,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaSecondaryLabel: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 16 },
  ctaPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaPrimaryLabel: { fontFamily: fontFamily.bold, color: colors.textInverse, fontSize: 16 },
});
