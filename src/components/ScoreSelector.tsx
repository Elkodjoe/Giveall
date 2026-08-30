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

  // Without this, a screen reader saw 10 unlabeled, individually-focusable
  // dots with no indication of the current value or how to change it.
  // accessibilityRole="adjustable" + accessibilityValue exposes this as one
  // control a screen reader can swipe-increment/decrement (VoiceOver's
  // rotor, TalkBack's local context menu), announcing "Seen, adjustable,
  // 5 of 10" — the individual dots are hidden from the accessibility tree
  // (importantForAccessibility/accessibilityElementsHidden) since they'd
  // otherwise still be reachable as 10 redundant unlabeled stops.
  const onAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    if (event.nativeEvent.actionName === 'increment') choose(Math.min(10, value + 1));
    else if (event.nativeEvent.actionName === 'decrement') choose(Math.max(1, value - 1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View
        style={styles.dots}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 1, max: 10, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
      >
        {SCALE.map((n) => (
          <Pressable
            key={n}
            style={[styles.dot, n <= value && styles.dotFilled]}
            onPress={() => choose(n)}
            hitSlop={4}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
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
