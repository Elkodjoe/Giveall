import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScoreSelector } from '../src/components/ScoreSelector';
import { useOnboarding } from '../src/state/OnboardingContext';
import { useAuth } from '../src/state/AuthContext';
import { tallyAttachment, tallyLoveLanguage } from '../src/engine/onboardingScoring';
import { checkinToAvw } from '../src/engine/scale';
import { getMicroAttunement } from '../src/engine/decisionMatrix';
import { summarizeWeek } from '../src/engine/bidTracker';
import type { UserProfile, MemoryVaultEntry, DesireInventoryEntry } from '../src/engine/types';
import type { MoodLabel } from '../src/firebase/types';
import { isFirebaseConfigured } from '../src/firebase/config';
import {
  getProfile,
  setProfile,
  addDailyCheckin,
  getUnusedMemoryVaultEntries,
  markMemoryVaultEntryUsed,
  getUnusedDesireInventoryEntries,
  markDesireInventoryEntryUsed,
  getBidsLastNDays,
  getUser,
  type MemoryVaultEntryWithId,
  type DesireInventoryEntryWithId,
} from '../src/firebase/collections';
import { buildInitialProfile } from '../src/firebase/profileSeeding';
import { scheduleCheckinReminder } from '../src/notifications/checkinReminder';
import { colors, radius, card, button, fontFamily } from '../src/theme/tokens';

// Daily Check-in — the 90-second core loop screen. Always runs the
// decision matrix against a UserProfile built from onboarding answers
// already in memory (works with zero Firestore setup, same as payoff.tsx's
// demo pattern). When Firebase is configured and signed in, also persists:
// creates the profile on first visit (buildInitialProfile) and writes the
// check-in via addDailyCheckin() — best-effort, never blocks showing the
// action if either write fails or is skipped.
const MOOD_LABELS: MoodLabel[] = [
  'hopeful',
  'joyful',
  'calm',
  'neutral',
  'anxious',
  'lonely',
  'disconnected',
  'triggered',
  'loved',
];

export default function CheckinScreen() {
  const router = useRouter();
  const { mode, attachmentAnswers, loveLanguagePicks, ritualTime } = useOnboarding();
  const { uid } = useAuth();
  const [seenScore, setSeenScore] = useState(5);
  const [safeScore, setSafeScore] = useState(5);
  const [soughtScore, setSoughtScore] = useState(5);
  const [moodScore, setMoodScore] = useState(5);
  const [moodLabel, setMoodLabel] = useState<MoodLabel | null>(null);
  const [showAction, setShowAction] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [memoryEntries, setMemoryEntries] = useState<MemoryVaultEntryWithId[]>([]);
  const [desireEntries, setDesireEntries] = useState<DesireInventoryEntryWithId[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    getUnusedMemoryVaultEntries(uid)
      .then(setMemoryEntries)
      .catch(() => {
        // best-effort; "Recall Detail" just falls back to a generic prompt
      });
    getUnusedDesireInventoryEntries(uid)
      .then(setDesireEntries)
      .catch(() => {
        // best-effort; "Specific Desire + Play" just falls back to a generic prompt
      });
  }, [uid]);

  const memoryVault = useMemo<MemoryVaultEntry[]>(
    () => memoryEntries.map((e) => ({ id: e.id, detail: e.content, date: e.date, tags: [], used: e.usedInGeneration })),
    [memoryEntries],
  );

  const desireInventory = useMemo<DesireInventoryEntry[]>(
    () => desireEntries.map((e) => ({ id: e.id, desire: e.desire, rank: e.rank, used: e.used })),
    [desireEntries],
  );

  const action = useMemo(() => {
    const { primary: attachmentStyle, spike } = tallyAttachment(attachmentAnswers);
    const { primary: receivesVia, secondary: givesVia } = tallyLoveLanguage(loveLanguagePicks);
    const avw = checkinToAvw({ seen_score: seenScore, safe_score: safeScore, sought_score: soughtScore });

    const profile: UserProfile = {
      mode: mode ?? 'ltr',
      attachmentStyle,
      attachmentSpike: spike,
      loveLanguagePrimary: receivesVia,
      loveLanguageSecondary: givesVia,
      avwScores: avw,
      memoryVault,
      desireInventory,
      bidLog: [],
      startDate: new Date().toISOString(),
    };

    return getMicroAttunement(profile);
  }, [mode, attachmentAnswers, loveLanguagePicks, seenScore, safeScore, soughtScore, memoryVault, desireInventory]);

  const handleSeeAction = async () => {
    setShowAction(true);
    setSaveError(null);

    if (!isFirebaseConfigured || !uid || !moodLabel) return;

    try {
      let profile = await getProfile(uid);
      if (!profile) {
        const initial = buildInitialProfile({
          userId: uid,
          attachmentAnswers,
          loveLanguagePicks,
          notificationTime: ritualTime ?? '19:00',
        });
        await setProfile(uid, initial);
      }

      await addDailyCheckin({
        userId: uid,
        date: new Date().toISOString().slice(0, 10),
        seen_score: seenScore,
        safe_score: safeScore,
        sought_score: soughtScore,
        moodScore,
        moodLabel,
        contextTags: [],
        bid_logged_today: false,
      });

      // Same "first unused" selection decisionMatrix.ts's nextUnused() makes
      // internally — re-derived here since getMicroAttunement() doesn't
      // expose which entry it picked, only the resulting action text.
      if (action.axis === 'seen') {
        const used = memoryEntries.find((e) => !e.usedInGeneration);
        if (used) await markMemoryVaultEntryUsed(used.id);
      } else if (action.axis === 'sought') {
        const used = desireEntries.find((e) => !e.used);
        if (used) await markDesireInventoryEntryUsed(used.id);
      }

      // Reschedule tomorrow's reminder with real context — only the bid
      // ratio (not a claim about how the partner felt, which we have no
      // actual feedback for) — falling back to the neutral line when there
      // aren't 7 days of bids yet. See src/notifications/checkinReminder.ts.
      const [user, bids] = await Promise.all([getUser(uid), getBidsLastNDays(uid, 7)]);
      if (user) {
        const bidLog = bids.map((b, i) => ({ id: String(i), description: b.bidDescription, response: b.response, date: b.date }));
        const summary = bidLog.length > 0 ? summarizeWeek(bidLog) : null;
        await scheduleCheckinReminder(
          user.notificationTime,
          summary ? { bidResponseRatioPct: Math.round(summary.towardRatio * 100) } : {},
        );
      }
    } catch (err) {
      // Non-fatal: the computed action above already rendered regardless.
      setSaveError(err instanceof Error ? err.message : 'Could not save check-in.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>90-sec Micro-Attunement</Text>
        <Text style={styles.sub}>How are things feeling right now?</Text>

        <ScoreSelector label="Seen" value={seenScore} onChange={setSeenScore} />
        <ScoreSelector label="Safe" value={safeScore} onChange={setSafeScore} />
        <ScoreSelector label="Sought" value={soughtScore} onChange={setSoughtScore} />
        <ScoreSelector label="Mood" value={moodScore} onChange={setMoodScore} />

        <Text style={styles.moodLabel}>In one word</Text>
        <View style={styles.moodGrid}>
          {MOOD_LABELS.map((m) => (
            <Pressable
              key={m}
              style={[styles.moodChip, moodLabel === m && styles.moodChipSelected]}
              onPress={() => setMoodLabel(m)}
            >
              <Text style={[styles.moodChipText, moodLabel === m && styles.moodChipTextSelected]}>{m}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={handleSeeAction}>
          <Text style={styles.ctaLabel}>See Today's Action</Text>
        </Pressable>

        {showAction && (
          <View style={styles.actionCard}>
            <Text style={styles.actionLabel}>Today's Micro-Action</Text>
            <Text style={styles.actionStrategy}>{action.strategy}</Text>
            <Text style={styles.actionText}>{action.action}</Text>
            <Text style={styles.actionMeta}>
              Axis: {action.axis} · Tone: {action.tone}
            </Text>
          </View>
        )}

        {saveError && <Text style={styles.errorText}>Couldn't save your check-in: {saveError}</Text>}

        <Pressable style={styles.link} onPress={() => router.push('/bids')}>
          <Text style={styles.linkText}>Log a bid for connection →</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push('/memory-vault')}>
          <Text style={styles.linkText}>Memory Vault →</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push('/desire-inventory')}>
          <Text style={styles.linkText}>Desire Inventory →</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push('/settings')}>
          <Text style={styles.linkTextSecondary}>Settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48 },
  headline: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 22, lineHeight: 28, marginBottom: 4 },
  sub: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 15, marginBottom: 24 },
  moodLabel: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 15, marginBottom: 8 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  moodChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  moodChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  moodChipText: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 13 },
  moodChipTextSelected: { color: colors.textInverse },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  ctaLabel: { fontFamily: fontFamily.bold, color: colors.textInverse, fontSize: 16 },
  actionCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 24,
    marginTop: 24,
    ...card.shadow,
  },
  actionLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  actionStrategy: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 18, marginBottom: 8 },
  actionText: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 16, lineHeight: 24, marginBottom: 12 },
  actionMeta: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13 },
  errorText: { fontFamily: fontFamily.regular, color: colors.error, fontSize: 13, marginTop: 12, textAlign: 'center' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { fontFamily: fontFamily.semiBold, color: colors.primary, fontSize: 14 },
  linkTextSecondary: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13 },
});
