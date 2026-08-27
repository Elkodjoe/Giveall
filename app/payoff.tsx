import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import { tallyAttachment, tallyLoveLanguage, buildPayoffSummary } from '../src/engine/onboardingScoring';

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
  container: { flex: 1, backgroundColor: '#160F1C', padding: 24 },
  summary: { color: '#F5EEF7', fontSize: 18, lineHeight: 26, marginBottom: 24 },
  winCard: {
    backgroundColor: '#241C2B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A2E44',
    flex: 1,
  },
  winLabel: { color: '#E8637A', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  winSubLabel: { color: '#C9BCD1', fontSize: 15, marginTop: 4, marginBottom: 16 },
  winText: { color: '#F5EEF7', fontSize: 20, lineHeight: 28, fontStyle: 'italic' },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  ctaSecondary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A2E44',
  },
  ctaSecondaryLabel: { color: '#F5EEF7', fontSize: 16, fontWeight: '600' },
  ctaPrimary: {
    flex: 1,
    backgroundColor: '#E8637A',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaPrimaryLabel: { color: '#160F1C', fontSize: 16, fontWeight: '700' },
});
