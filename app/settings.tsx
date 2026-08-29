import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/state/AuthContext';
import { isFirebaseConfigured } from '../src/firebase/config';
import { deleteAllMemoryVaultEntries, getDailyCheckinsLastNDays } from '../src/firebase/collections';
import { averageCheckins, type WeeklyCheckinAverage } from '../src/engine/scale';
import { colors, radius, card, button, fontFamily } from '../src/theme/tokens';

// Settings — ships the exact privacy guardrail copy from docs/03-power-ups.md
// #3, verbatim: "This is your private sanctuary. No data is ever sold.
// Partner mode requires explicit double opt-in. You can delete your
// Memory Vault anytime." That doc is explicit this copy is not decorative
// and changes to it are a product decision, not a copy tweak — don't edit
// it here without updating that doc too.
export default function SettingsScreen() {
  const router = useRouter();
  const { uid } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [weekAvg, setWeekAvg] = useState<WeeklyCheckinAverage | null>(null);

  // getDailyCheckinsLastNDays() had no callers anywhere in the app despite
  // daily_checkins being written every check-in — this is the only place a
  // user could see their own logged history reflected back. Best-effort,
  // no empty-state card when there's nothing to show yet.
  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    getDailyCheckinsLastNDays(uid, 7)
      .then((checkins) => setWeekAvg(averageCheckins(checkins)))
      .catch(() => {
        // best-effort; the card just doesn't render
      });
  }, [uid]);

  const confirmDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setStatus(null);
    if (!isFirebaseConfigured || !uid) {
      setConfirming(false);
      return;
    }
    try {
      await deleteAllMemoryVaultEntries(uid);
      setStatus('Memory Vault cleared.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not clear Memory Vault.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>Settings</Text>

        {weekAvg && (
          <View style={styles.trendCard}>
            <Text style={styles.trendLabel}>Your Last 7 Days</Text>
            <View style={styles.trendRow}>
              <View style={styles.trendStat}>
                <Text style={styles.trendValue}>{weekAvg.seen_score}</Text>
                <Text style={styles.trendStatLabel}>Seen</Text>
              </View>
              <View style={styles.trendStat}>
                <Text style={styles.trendValue}>{weekAvg.safe_score}</Text>
                <Text style={styles.trendStatLabel}>Safe</Text>
              </View>
              <View style={styles.trendStat}>
                <Text style={styles.trendValue}>{weekAvg.sought_score}</Text>
                <Text style={styles.trendStatLabel}>Sought</Text>
              </View>
              <View style={styles.trendStat}>
                <Text style={styles.trendValue}>{weekAvg.moodScore}</Text>
                <Text style={styles.trendStatLabel}>Mood</Text>
              </View>
            </View>
            <Text style={styles.trendMeta}>
              {weekAvg.daysLogged} check-in{weekAvg.daysLogged === 1 ? '' : 's'} logged this week
            </Text>
          </View>
        )}

        <View style={styles.privacyCard}>
          <Text style={styles.privacyText}>
            This is your private sanctuary. No data is ever sold. Partner mode requires explicit double opt-in. You
            can delete your Memory Vault anytime.
          </Text>
        </View>

        <Pressable style={styles.link} onPress={() => router.push('/memory-vault')}>
          <Text style={styles.linkText}>Manage Memory Vault →</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push('/partner')}>
          <Text style={styles.linkText}>Partner Mode →</Text>
        </Pressable>

        <Pressable style={[styles.dangerButton, confirming && styles.dangerButtonConfirming]} onPress={confirmDelete}>
          <Text style={[styles.dangerButtonLabel, confirming && styles.dangerButtonLabelConfirming]}>
            {confirming ? 'Tap again to confirm deletion' : 'Delete my Memory Vault'}
          </Text>
        </Pressable>
        {confirming && (
          <Pressable onPress={() => setConfirming(false)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </Pressable>
        )}

        {status && <Text style={styles.statusText}>{status}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48 },
  headline: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 22, lineHeight: 28, marginBottom: 20 },
  privacyCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 20,
    marginBottom: 24,
    ...card.shadow,
  },
  privacyText: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  trendCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 20,
    marginBottom: 24,
    ...card.shadow,
  },
  trendLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trendStat: { alignItems: 'center' },
  trendValue: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 22 },
  trendStatLabel: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  trendMeta: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 12, marginTop: 12, textAlign: 'center' },
  link: { marginBottom: 32 },
  linkText: { fontFamily: fontFamily.semiBold, color: colors.primary, fontSize: 15 },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerButtonConfirming: { backgroundColor: colors.error },
  dangerButtonLabel: { fontFamily: fontFamily.semiBold, color: colors.error, fontSize: 15 },
  dangerButtonLabelConfirming: { color: colors.textInverse },
  cancelLink: {
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  statusText: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13, marginTop: 16, textAlign: 'center' },
});
