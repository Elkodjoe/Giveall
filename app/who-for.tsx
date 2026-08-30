import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { OptionCard } from '../src/components/OptionCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { useOnboarding } from '../src/state/OnboardingContext';
import type { Mode } from '../src/engine/types';
import { colors, fontFamily } from '../src/theme/tokens';

// Screen 2 — Who Are You Here For? Branches `mode` for the whole algorithm.
const MODES: Mode[] = ['crush', 'new', 'ltr', 'healing'];

export default function WhoForScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setMode } = useOnboarding();

  const choose = (mode: Mode) => {
    setMode(mode);
    router.push('/attachment');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={1} total={4} />
      <Text style={styles.headline}>{t('whoFor.headline')}</Text>
      <View style={styles.options}>
        {MODES.map((mode) => (
          <OptionCard key={mode} label={t(`whoFor.options.${mode}`)} onPress={() => choose(mode)} />
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
