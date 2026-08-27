import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard } from '../src/components/OptionCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import { ATTACHMENT_QUESTIONS } from '../src/data/onboardingQuestions';

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
  container: { flex: 1, backgroundColor: '#160F1C', padding: 24 },
  headline: { color: '#F5EEF7', fontSize: 22, fontWeight: '700', marginBottom: 24 },
  options: { flex: 1 },
});
