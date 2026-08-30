import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radius, button, fontFamily } from '../src/theme/tokens';

// Screen 1 — The Promise. See docs/01-onboarding-flow.md.
export default function PromiseScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headline}>{t('promise.headline')}</Text>
        <Text style={styles.sub}>{t('promise.sub')}</Text>
      </View>
      <Pressable style={styles.cta} onPress={() => router.push('/who-for')}>
        <Text style={styles.ctaLabel}>{t('promise.cta')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center' },
  headline: { fontFamily: fontFamily.extraBold, color: colors.textPrimary, fontSize: 32, lineHeight: 36, marginBottom: 12 },
  sub: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaLabel: { fontFamily: fontFamily.bold, color: colors.textInverse, fontSize: 16 },
});
