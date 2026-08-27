import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export function OptionCard({ label, onPress }: { label: string; onPress: () => void }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={handlePress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#241C2B',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A2E44',
  },
  pressed: {
    backgroundColor: '#2E2436',
  },
  label: {
    color: '#F5EEF7',
    fontSize: 16,
    fontWeight: '500',
  },
});
