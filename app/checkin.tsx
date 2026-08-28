import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScoreSelector } from '../src/components/ScoreSelector';
import { useOnboarding } from '../src/state/OnboardingContext';
import { tallyAttachment, tallyLoveLanguage } from '../src/engine/onboardingScoring';
import { checkinToAvw } from '../src/engine/scale';
import { getMicroAttunement } from '../src/engine/decisionMatrix';
import type { UserProfile } from '../src/engine/types';
import type { MoodLabel } from '../src/firebase/types';
import { colors, radius, card, button, fontFamily } from '../src/theme/tokens';

// Daily Check-in — the 90-second core loop screen. Client-only for now:
// builds a UserProfile from onboarding answers already in memory and runs
// it straight through the decision matrix, same as payoff.tsx's demo
// pattern. Production would instead read a persisted ProfileDoc from
// Firestore and write this check-in via addDailyCheckin() (see
// src/firebase/collections.ts) before/alongside running the engine.
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
  const { mode, attachmentAnswers, loveLanguagePicks } = useOnboarding();
  const [seenScore, setSeenScore] = useState(5);
  const [safeScore, setSafeScore] = useState(5);
  const [soughtScore, setSoughtScore] = useState(5);
  const [moodLabel, setMoodLabel] = useState<MoodLabel | null>(null);
  const [showAction, setShowAction] = useState(false);

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
      memoryVault: [],
      desireInventory: [],
      bidLog: [],
      startDate: new Date().toISOString(),
    };

    return getMicroAttunement(profile);
  }, [mode, attachmentAnswers, loveLanguagePicks, seenScore, safeScore, soughtScore]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>90-sec Micro-Attunement</Text>
        <Text style={styles.sub}>How are things feeling right now?</Text>

        <ScoreSelector label="Seen" value={seenScore} onChange={setSeenScore} />
        <ScoreSelector label="Safe" value={safeScore} onChange={setSafeScore} />
        <ScoreSelector label="Sought" value={soughtScore} onChange={setSoughtScore} />

        <Text style={styles.moodLabel}>Mood</Text>
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

        <Pressable style={styles.cta} onPress={() => setShowAction(true)}>
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
});
