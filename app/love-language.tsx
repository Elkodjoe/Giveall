import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard } from '../src/components/OptionCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import { LOVE_LANGUAGE_PAIRS } from '../src/data/onboardingQuestions';
import { colors, fontFamily } from '../src/theme/tokens';

// Screen 4 — Love Language Forced Choice. 4 taps, not a ranked list.
export default function LoveLanguageScreen() {
  const router = useRouter();
  const { addLoveLanguagePick } = useOnboarding();
  const [index, setIndex] = useState(0);

  const pair = LOVE_LANGUAGE_PAIRS[index];

  const choose = (language: (typeof pair.options)[number]['language']) => {
    addLoveLanguagePick(language);
    if (index + 1 < LOVE_LANGUAGE_PAIRS.length) {
      setIndex(index + 1);
    } else {
      router.push('/payoff');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={3 + index / LOVE_LANGUAGE_PAIRS.length} total={4} />
      <Text style={styles.headline}>{pair.prompt}</Text>
      <View style={styles.options}>
        {pair.options.map((opt, i) => (
          <OptionCard key={i} label={opt.label} onPress={() => choose(opt.language)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  headline: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 22, lineHeight: 28, marginBottom: 16 },
  options: { flex: 1 },
});
