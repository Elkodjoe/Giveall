import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(1, Math.max(0, step / total));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.blush,
    overflow: 'hidden',
    marginBottom: 24,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
