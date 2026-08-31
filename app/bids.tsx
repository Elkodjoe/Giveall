import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
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
const RESPONSES: BidResponse[] = ['toward', 'away', 'against'];

export default function BidsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
      setSaveError(err instanceof Error ? err.message : t('bids.genericSaveError'));
    }
  };

  const triggerRepairQuest = shouldTriggerRepairQuest(summary);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>{t('bids.headline')}</Text>
        <Text style={styles.sub}>{t('bids.sub')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('bids.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          accessibilityLabel={t('bids.placeholder')}
        />

        <View style={styles.chipRow}>
          {BID_TYPES.map((bt) => (
            <Pressable
              key={bt}
              style={[styles.chip, bidType === bt && styles.chipSelected]}
              onPress={() => setBidType(bt)}
              accessibilityRole="button"
              accessibilityState={{ selected: bidType === bt }}
            >
              <Text style={[styles.chipText, bidType === bt && styles.chipTextSelected]}>{t(`bids.types.${bt}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.question}>{t('bids.didYouTurn')}</Text>
        <View style={styles.responseRow}>
          {RESPONSES.map((r) => (
            <Pressable
              key={r}
              style={[styles.responseButton, styles[`response_${r}`]]}
              onPress={() => logBid(r)}
              accessibilityRole="button"
            >
              <Text style={[styles.responseLabel, r === 'against' && styles.responseLabelOnDark]}>
                {t(`bids.responses.${r}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('bids.thisWeek')}</Text>
          {summary.total === 0 ? (
            <Text style={styles.summaryEmpty}>{t('bids.noBidsYet')}</Text>
          ) : (
            <>
              <Text style={styles.summaryRatio}>{t('bids.towardPercent', { pct: Math.round(summary.towardRatio * 100) })}</Text>
              <Text style={styles.summaryMeta}>
                {t('bids.meta', { toward: summary.towardCount, away: summary.awayCount, against: summary.againstCount })}
              </Text>
              {summary.isSecureZone ? (
                <Text style={styles.badgeSuccess}>
                  {t('bids.secureZone', { pct: Math.round(summary.towardRatio * 100) })}
                </Text>
              ) : (
                <Text style={styles.badgeWarning}>
                  {t('bids.belowThreshold', { pct: Math.round(SECURE_ZONE_THRESHOLD * 100) })}
                </Text>
              )}
              {triggerRepairQuest && (
                <Text style={styles.repairQuest}>{t('bids.repairQuest')}</Text>
              )}
            </>
          )}
        </View>

        {saveError && <Text style={styles.errorText}>{t('bids.saveError', { error: saveError })}</Text>}

        <Pressable style={styles.link} onPress={() => router.push('/curiosity')} accessibilityRole="link">
          <Text style={styles.linkText}>{t('bids.curiosityLink')}</Text>
        </Pressable>
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
    // 12 (was 8) so the tappable chip reaches closer to the 44px WCAG 2.5.5
    // touch-target minimum, not just the visible pill's original ~34px.
    paddingVertical: 12,
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
  // response_against's background is colors.primary (a solid, dark-ish
  // color) — the shared dark responseLabel text was only 2.72:1 against it,
  // failing WCAG AA (needs 4.5:1). toward/away keep dark text since their
  // backgrounds (success, surfaceAlt) are pale; only against needs light text.
  responseLabelOnDark: { color: colors.textInverse },
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
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { fontFamily: fontFamily.semiBold, color: colors.primary, fontSize: 14 },
});
