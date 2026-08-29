import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import { tallyAttachment, tallyLoveLanguage, buildPayoffSummary } from '../src/engine/onboardingScoring';
import { isFirebaseConfigured } from '../src/firebase/config';
import { generateAppreciation } from '../src/firebase/appreciationClient';
import { colors, radius, button, card, fontFamily } from '../src/theme/tokens';

// Screen 5 — The Payoff Preview. The Aha Moment: value delivered before any
// ask. Renders FIRST_WIN_FALLBACK instantly (this screen must never feel
// like it's waiting on a network call) and, if Firebase + a Cloud Function
// provider are available, kicks off a background call to
// generateAppreciation() (functions/src/generateAppreciation.ts, which
// wraps buildAppreciationPrompt() from src/engine/appreciationGenerator.ts)
// and silently swaps in the real result if it arrives — no loading spinner,
// no error shown if it fails, just stays on the fallback.
const FIRST_WIN_FALLBACK = "I love how you think out loud when you're solving something - you don't hide the messy part.";
const GENERIC_SEED_COMPLIMENT = 'You are wonderful.';

export default function PayoffScreen() {
  const router = useRouter();
  const { attachmentAnswers, loveLanguagePicks } = useOnboarding();
  const [firstWin, setFirstWin] = useState(FIRST_WIN_FALLBACK);

  const { summary, receivesVia } = useMemo(() => {
    const { primary, spike } = tallyAttachment(attachmentAnswers);
    const { primary: receivesVia, secondary: givesVia } = tallyLoveLanguage(loveLanguagePicks);
    return {
      receivesVia,
      summary: buildPayoffSummary({
        primaryAttachment: primary,
        spikeAttachment: spike,
        receivesVia,
        givesVia,
      }),
    };
  }, [attachmentAnswers, loveLanguagePicks]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    generateAppreciation({ genericCompliment: GENERIC_SEED_COMPLIMENT, loveLanguage: receivesVia })
      .then((result) => {
        if (!cancelled) setFirstWin(result.text);
      })
      .catch(() => {
        // Cloud Function not deployed yet, no provider configured, or a
        // network error — stays on FIRST_WIN_FALLBACK, no error surfaced.
      });
    return () => {
      cancelled = true;
    };
  }, [receivesVia]);

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={4} total={4} />
      <Text style={styles.summary}>{summary}</Text>

      <View style={styles.winCard}>
        <Text style={styles.winLabel}>Your First Win</Text>
        <Text style={styles.winSubLabel}>Your Unsolicited Appreciation</Text>
        <Text style={styles.winText}>"{firstWin}"</Text>
      </View>

      <View style={styles.ctaRow}>
        <Pressable style={styles.ctaSecondary} onPress={() => router.push('/ritual-time')}>
          <Text style={styles.ctaSecondaryLabel}>Save it</Text>
        </Pressable>
        <Pressable style={styles.ctaPrimary} onPress={() => router.push('/ritual-time')}>
          <Text style={styles.ctaPrimaryLabel}>Send it</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  summary: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 18, lineHeight: 26, marginBottom: 24 },
  winCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 24,
    flex: 1,
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
