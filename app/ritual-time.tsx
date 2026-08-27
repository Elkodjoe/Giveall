import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useOnboarding } from '../src/state/OnboardingContext';

// Screen 6 — Soft Permission + Ritual Time.
// Notification permission is requested AFTER the time choice, never before —
// this ordering is load-bearing for conversion, see docs/01-onboarding-flow.md.
const TIME_OPTIONS = ['7pm', '9pm', 'Custom'];

export default function RitualTimeScreen() {
  const router = useRouter();
  const { setRitualTime } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(null);

  const choose = async (time: string) => {
    setSelected(time);
    setRitualTime(time);
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // permission prompt unavailable (e.g. web/simulator) — non-fatal
    }
    router.push('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headline}>When should we do your 90-sec check-in?</Text>
      <Text style={styles.sub}>Most people pick after dinner.</Text>

      <View style={styles.options}>
        {TIME_OPTIONS.map((time) => (
          <Pressable
            key={time}
            style={[styles.option, selected === time && styles.optionSelected]}
            onPress={() => choose(time)}
          >
            <Text style={styles.optionLabel}>{time}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#160F1C', padding: 24, justifyContent: 'center' },
  headline: { color: '#F5EEF7', fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  sub: { color: '#C9BCD1', fontSize: 15, marginBottom: 32, textAlign: 'center' },
  options: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  option: {
    borderWidth: 1,
    borderColor: '#3A2E44',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionSelected: { backgroundColor: '#E8637A', borderColor: '#E8637A' },
  optionLabel: { color: '#F5EEF7', fontSize: 16, fontWeight: '600' },
});
