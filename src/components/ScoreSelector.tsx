import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily } from '../theme/tokens';

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// A row of tappable 1-10 dots rather than a native slider — keeps this
// consistent with the rest of the app's hand-styled components and avoids
// pulling in a slider native module for one screen.
export function ScoreSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const choose = (n: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(n);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.dots}>
        {SCALE.map((n) => (
          <Pressable
            key={n}
            style={[styles.dot, n <= value && styles.dotFilled]}
            onPress={() => choose(n)}
            hitSlop={4}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 15 },
  value: { fontFamily: fontFamily.bold, color: colors.primary, fontSize: 15 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
});
