import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import { tallyAttachment, tallyLoveLanguage, buildPayoffSummary } from '../src/engine/onboardingScoring';
import { colors, radius, button, card, fontFamily } from '../src/theme/tokens';

// Screen 5 — The Payoff Preview. The Aha Moment: value delivered before any ask.
// "First Win" copy here is a static placeholder for the demo; production
// wires this through buildAppreciationPrompt() (src/engine/appreciationGenerator.ts)
// to an LLM call once a provider is chosen.
const FIRST_WIN = "I love how you think out loud when you're solving something - you don't hide the messy part.";

export default function PayoffScreen() {
  const router = useRouter();
  const { attachmentAnswers, loveLanguagePicks } = useOnboarding();

  const summary = useMemo(() => {
    const { primary, spike } = tallyAttachment(attachmentAnswers);
    const { primary: receivesVia, secondary: givesVia } = tallyLoveLanguage(loveLanguagePicks);
    return buildPayoffSummary({
      primaryAttachment: primary,
      spikeAttachment: spike,
      receivesVia,
      givesVia,
    });
  }, [attachmentAnswers, loveLanguagePicks]);

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={4} total={4} />
      <Text style={styles.summary}>{summary}</Text>

      <View style={styles.winCard}>
        <Text style={styles.winLabel}>Your First Win</Text>
        <Text style={styles.winSubLabel}>Your Unsolicited Appreciation</Text>
        <Text style={styles.winText}>"{FIRST_WIN}"</Text>
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
