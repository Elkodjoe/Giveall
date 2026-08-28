import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useOnboarding } from '../src/state/OnboardingContext';
import { colors, radius, fontFamily } from '../src/theme/tokens';

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
    // '/' is Screen 1 (The Promise) — routing there after onboarding would
    // restart the flow. '/checkin' is the daily-use home for now; there's
    // no separate dashboard/home screen yet.
    router.replace('/checkin');
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
            <Text style={[styles.optionLabel, selected === time && styles.optionLabelSelected]}>{time}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center' },
  headline: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 22, lineHeight: 28, marginBottom: 8, textAlign: 'center' },
  sub: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 15, marginBottom: 32, textAlign: 'center' },
  options: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionLabel: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 16 },
  optionLabelSelected: { color: colors.textInverse },
});
