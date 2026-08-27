import React from 'react';
import { View, StyleSheet } from 'react-native';

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
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2230',
    overflow: 'hidden',
    marginBottom: 24,
  },
  fill: {
    height: '100%',
    backgroundColor: '#E8637A',
    borderRadius: 3,
  },
});
