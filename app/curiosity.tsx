import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/state/AuthContext';
import { nextCard, tierForWeek } from '../src/engine/curiosityLadder';
import { isFirebaseConfigured } from '../src/firebase/config';
import { getCompletedCuriosityCardIds, markCuriosityCardCompleted } from '../src/firebase/collections';
import { colors, card, button, fontFamily } from '../src/theme/tokens';

// Curiosity Card — one conversation prompt at a time, gated by the
// intimacy ladder (see src/engine/curiosityLadder.ts). No real onboarding
// completion date is tracked yet anywhere in the app, so `weeksSinceStart`
// is fixed at 0 here (always the gratitude/joy tier) rather than computed
// from a persisted start date — same class of simplification as
// bids.tsx's "no meaningful historical demo" note. Fix this together with
// whatever eventually writes UserDoc.createdAt.
const WEEKS_SINCE_START = 0;

export default function CuriosityScreen() {
  const { uid } = useAuth();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [justCompleted, setJustCompleted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    getCompletedCuriosityCardIds(uid)
      .then(setCompletedIds)
      .catch(() => {
        // best-effort seed; local-only completion still works if this fails
      });
  }, [uid]);

  const tier = tierForWeek(WEEKS_SINCE_START);
  const currentCard = nextCard(WEEKS_SINCE_START, completedIds);

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
            <Text style={styles.promptText}>{currentCard.prompt}</Text>
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
