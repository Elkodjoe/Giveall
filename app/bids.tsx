import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/state/AuthContext';
import { summarizeWeek, shouldTriggerRepairQuest, SECURE_ZONE_THRESHOLD } from '../src/engine/bidTracker';
import type { BidLogEntry, BidResponse } from '../src/engine/types';
import type { BidType } from '../src/firebase/types';
import { isFirebaseConfigured } from '../src/firebase/config';
import { getBidsLastNDays, addBid } from '../src/firebase/collections';
import { colors, radius, card, button, fontFamily } from '../src/theme/tokens';

// Bid Tracker — logs Gottman "bids for connection" and shows the weekly
// toward-ratio. Unlike checkin.tsx, this is inherently historical (needs 7
// days of data), so there's no meaningful client-only instant demo — the
// bidLog starts empty and grows from bids logged this session, seeded from
// Firestore's last 7 days when configured (best-effort, same graceful
// degradation pattern as checkin.tsx).
const BID_TYPES: BidType[] = ['comment', 'touch', 'joke', 'help'];
const RESPONSES: { value: BidResponse; label: string }[] = [
  { value: 'toward', label: 'Toward' },
  { value: 'away', label: 'Away' },
  { value: 'against', label: 'Against' },
];

export default function BidsScreen() {
  const { uid } = useAuth();
  const [bidLog, setBidLog] = useState<BidLogEntry[]>([]);
  const [description, setDescription] = useState('');
  const [bidType, setBidType] = useState<BidType>('comment');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    getBidsLastNDays(uid, 7)
      .then((docs) => {
        setBidLog(
          docs.map((d, i) => ({
            id: `remote-${i}`,
            description: d.bidDescription,
            response: d.response,
            date: d.date,
          })),
        );
      })
      .catch(() => {
        // best-effort seed; local logging still works if this fails
      });
  }, [uid]);

  const summary = useMemo(() => summarizeWeek(bidLog), [bidLog]);

  const logBid = async (response: BidResponse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSaveError(null);

    const entry: BidLogEntry = {
      id: `local-${Date.now()}`,
      description: description.trim() || '(no description)',
      response,
      date: new Date().toISOString(),
    };
    const nextLog = [...bidLog, entry];
    setBidLog(nextLog);
    setDescription('');

    if (!isFirebaseConfigured || !uid) return;
    try {
      const nextRatio = summarizeWeek(nextLog).towardRatio;
      await addBid({
        userId: uid,
        date: entry.date.slice(0, 10),
        bidDescription: entry.description,
        bidType,
        response,
        ratioWeekly: nextRatio,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save bid.');
    }
  };

  const triggerRepairQuest = shouldTriggerRepairQuest(summary);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>Bid Tracker</Text>
        <Text style={styles.sub}>Log a small moment, then say how it landed.</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. Partner made a joke while I was on my phone"
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.chipRow}>
          {BID_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[styles.chip, bidType === t && styles.chipSelected]}
              onPress={() => setBidType(t)}
            >
              <Text style={[styles.chipText, bidType === t && styles.chipTextSelected]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.question}>Did you turn...</Text>
        <View style={styles.responseRow}>
          {RESPONSES.map((r) => (
            <Pressable
              key={r.value}
              style={[styles.responseButton, styles[`response_${r.value}`]]}
              onPress={() => logBid(r.value)}
            >
              <Text style={styles.responseLabel}>{r.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Week</Text>
          {summary.total === 0 ? (
            <Text style={styles.summaryEmpty}>No bids logged yet this week.</Text>
          ) : (
            <>
              <Text style={styles.summaryRatio}>{Math.round(summary.towardRatio * 100)}% toward</Text>
              <Text style={styles.summaryMeta}>
                {summary.towardCount} toward · {summary.awayCount} away · {summary.againstCount} against
              </Text>
              {summary.isSecureZone ? (
                <Text style={styles.badgeSuccess}>
                  Bid Response: {Math.round(summary.towardRatio * 100)}% — that's Secure Zone!
                </Text>
              ) : (
                <Text style={styles.badgeWarning}>
                  Below the {Math.round(SECURE_ZONE_THRESHOLD * 100)}% Secure Zone threshold.
                </Text>
              )}
              {triggerRepairQuest && (
                <Text style={styles.repairQuest}>
                  Try a Curiosity Card + Appreciation quest today to help turn this around.
                </Text>
              )}
            </>
          )}
        </View>

        {saveError && <Text style={styles.errorText}>Couldn't save that bid: {saveError}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48 },
  headline: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 22, lineHeight: 28, marginBottom: 4 },
  sub: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 15, marginBottom: 20 },
  input: {
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    fontSize: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 13 },
  chipTextSelected: { color: colors.textInverse },
  question: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 15, marginBottom: 8 },
  responseRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  responseButton: {
    flex: 1,
    borderRadius: button.radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  response_toward: { backgroundColor: colors.success },
  response_away: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  response_against: { backgroundColor: colors.primary },
  responseLabel: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 14 },
  summaryCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 24,
    ...card.shadow,
  },
  summaryLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  summaryEmpty: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 15 },
  summaryRatio: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 28, marginBottom: 4 },
  summaryMeta: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13, marginBottom: 12 },
  badgeSuccess: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 14 },
  badgeWarning: { fontFamily: fontFamily.semiBold, color: colors.textSecondary, fontSize: 14 },
  repairQuest: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  errorText: { fontFamily: fontFamily.regular, color: colors.error, fontSize: 13, marginTop: 12, textAlign: 'center' },
});
