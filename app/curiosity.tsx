import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/state/AuthContext';
import { nextCard, tierForWeek, levelForTier, weeksSinceStart as computeWeeksSinceStart } from '../src/engine/curiosityLadder';
import { isFirebaseConfigured } from '../src/firebase/config';
import {
  getCompletedCuriosityCardIds,
  markCuriosityCardCompleted,
  getUser,
  getCuriosityCardsForLevel,
} from '../src/firebase/collections';
import { colors, card, button, fontFamily } from '../src/theme/tokens';

// Curiosity Card — one conversation prompt at a time, gated by the
// intimacy ladder (see src/engine/curiosityLadder.ts), anchored to
// UserDoc.createdAt (written by app/ritual-time.tsx on onboarding
// completion — see createUserIfNeeded()). Without Firebase configured
// there's no persisted start date, so it falls back to week 0 (always the
// gratitude/joy tier) — the same graceful-degradation pattern as the other
// screens, not a real substitute for tracking time.
export default function CuriosityScreen() {
  const { uid } = useAuth();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [weeks, setWeeks] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [catalogQuestions, setCatalogQuestions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    getCompletedCuriosityCardIds(uid)
      .then(setCompletedIds)
      .catch(() => {
        // best-effort seed; local-only completion still works if this fails
      });
    getUser(uid)
      .then((user) => {
        if (user) setWeeks(computeWeeksSinceStart(user.createdAt.toDate().toISOString()));
      })
      .catch(() => {
        // falls back to week 0 (gratitude/joy tier) if this fails
      });
  }, [uid]);

  const tier = tierForWeek(weeks);

  // curiosity_cards is the content-managed catalog (same role as
  // suggested_actions — see docs/04-firebase-schema.md) that was seeded
  // and typed but never fetched: prompts always came from CARDS, the
  // engine's hardcoded local copy. Not user-scoped, so this only needs to
  // re-run when the tier (derived from weeks) changes.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getCuriosityCardsForLevel(levelForTier(tier))
      .then((docs) => setCatalogQuestions(Object.fromEntries(docs.map((d) => [d.id, d.question]))))
      .catch(() => {
        // best-effort; falls back to CARDS' hardcoded prompt text
      });
  }, [tier]);

  const currentCard = nextCard(weeks, completedIds);
  const displayedPrompt = currentCard ? catalogQuestions[currentCard.id] ?? currentCard.prompt : undefined;

  const markDone = async () => {
    if (!currentCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCompletedIds((ids) => [...ids, currentCard.id]);
    setJustCompleted(true);
    setSaveError(null);

    if (!isFirebaseConfigured || !uid) return;
    try {
      await markCuriosityCardCompleted(uid, currentCard.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your progress.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.tierLabel}>{tier.replace('_', ' & ')}</Text>
        <Text style={styles.headline}>Today's Curiosity Card</Text>

        {currentCard ? (
          <View style={styles.promptCard}>
            <Text style={styles.promptText}>{displayedPrompt}</Text>
          </View>
        ) : (
          <View style={styles.promptCard}>
            <Text style={styles.promptText}>You've completed every card for this stage. More unlock as your ritual continues.</Text>
          </View>
        )}

        {currentCard && !justCompleted && (
          <Pressable style={styles.cta} onPress={markDone}>
            <Text style={styles.ctaLabel}>We talked about this</Text>
          </Pressable>
        )}

        {justCompleted && <Text style={styles.doneText}>Nice — that's one more shared.</Text>}
        {saveError && <Text style={styles.errorText}>Couldn't save your progress: {saveError}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  tierLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 8,
  },
  headline: {
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 24,
  },
  promptCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 28,
    marginBottom: 24,
    ...card.shadow,
  },
  promptText: {
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 28,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaLabel: { fontFamily: fontFamily.bold, color: colors.textInverse, fontSize: 16 },
  doneText: {
    fontFamily: fontFamily.semiBold,
    color: colors.success,
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: { fontFamily: fontFamily.regular, color: colors.error, fontSize: 13, marginTop: 12, textAlign: 'center' },
});
