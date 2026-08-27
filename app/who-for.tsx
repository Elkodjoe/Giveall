import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OptionCard } from '../src/components/OptionCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import type { Mode } from '../src/engine/types';

// Screen 2 — Who Are You Here For? Branches `mode` for the whole algorithm.
const OPTIONS: { label: string; mode: Mode }[] = [
  { label: 'Got a crush I want to be closer to', mode: 'crush' },
  { label: 'Dating someone new (0-6 months)', mode: 'new' },
  { label: 'In a long-term relationship', mode: 'ltr' },
  { label: 'Healing / Becoming magnetic for next love', mode: 'healing' },
];

export default function WhoForScreen() {
  const router = useRouter();
  const { setMode } = useOnboarding();

  const choose = (mode: Mode) => {
    setMode(mode);
    router.push('/attachment');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={1} total={4} />
      <Text style={styles.headline}>Who are you here for?</Text>
      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.mode} label={opt.label} onPress={() => choose(opt.mode)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#160F1C', padding: 24 },
  headline: { color: '#F5EEF7', fontSize: 26, fontWeight: '700', marginBottom: 24 },
  options: { flex: 1 },
});
