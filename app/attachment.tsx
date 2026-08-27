import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard } from '../src/components/OptionCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import { ATTACHMENT_QUESTIONS } from '../src/data/onboardingQuestions';
import { colors, fontFamily } from '../src/theme/tokens';

// Screen 3 — Attachment Snapshot. 6 scenario questions, not 36.
export default function AttachmentScreen() {
  const router = useRouter();
  const { addAttachmentAnswer } = useOnboarding();
  const [index, setIndex] = useState(0);

  const question = ATTACHMENT_QUESTIONS[index];

  const answer = (style: (typeof question.options)[number]['style']) => {
    addAttachmentAnswer(style);
    if (index + 1 < ATTACHMENT_QUESTIONS.length) {
      setIndex(index + 1);
    } else {
      router.push('/love-language');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={2 + index / ATTACHMENT_QUESTIONS.length} total={4} />
      <Text style={styles.headline}>{question.prompt}</Text>
      <View style={styles.options}>
        {question.options.map((opt, i) => (
          <OptionCard key={i} label={opt.label} onPress={() => answer(opt.style)} />
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
