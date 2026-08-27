import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screen 1 — The Promise. See docs/01-onboarding-flow.md.
export default function PromiseScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headline}>Love is a daily practice.</Text>
        <Text style={styles.sub}>
          90 seconds a day to feel more Attractive, Valued, and Wanted.
        </Text>
      </View>
      <Pressable style={styles.cta} onPress={() => router.push('/who-for')}>
        <Text style={styles.ctaLabel}>Start My Assessment</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#160F1C', padding: 24, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center' },
  headline: { color: '#F5EEF7', fontSize: 34, fontWeight: '700', marginBottom: 16 },
  sub: { color: '#C9BCD1', fontSize: 17, lineHeight: 24 },
  cta: {
    backgroundColor: '#E8637A',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaLabel: { color: '#160F1C', fontSize: 17, fontWeight: '700' },
});
