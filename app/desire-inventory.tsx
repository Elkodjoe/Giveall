import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/state/AuthContext';
import { isFirebaseConfigured } from '../src/firebase/config';
import {
  getAllDesireInventoryEntries,
  addDesireInventoryEntry,
  deleteDesireInventoryEntry,
  type DesireInventoryEntryWithId,
} from '../src/firebase/collections';
import { colors, radius, card, button, fontFamily } from '../src/theme/tokens';

// Desire Inventory — ranked things that make the user (or their partner)
// feel wanted, used by decisionMatrix.ts's "Specific Desire + Play"
// prescription when sought_score is lowest (see docs/02-love-os-brain.md
// #2). Without any entries, that prescription falls back to a generic
// line — same gap class Memory Vault had for the "seen" axis before
// app/memory-vault.tsx existed. New entries are appended at the end
// (rank = current count + 1); no drag-to-reorder yet, so "most wanted"
// currently just means "added first."
export default function DesireInventoryScreen() {
  const { t } = useTranslation();
  const { uid } = useAuth();
  const [entries, setEntries] = useState<DesireInventoryEntryWithId[]>([]);
  const [desire, setDesire] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isFirebaseConfigured || !uid) return;
    getAllDesireInventoryEntries(uid)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : t('desireInventory.genericLoadError')));
  }, [uid, t]);

  useFocusEffect(load);

  const addEntry = async () => {
    if (!desire.trim() || !isFirebaseConfigured || !uid) return;
    setError(null);
    try {
      await addDesireInventoryEntry({
        userId: uid,
        desire: desire.trim(),
        rank: entries.length + 1,
        used: false,
      });
      setDesire('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('desireInventory.genericAddError'));
    }
  };

  const removeEntry = async (id: string) => {
    setEntries((es) => es.filter((e) => e.id !== id)); // optimistic
    try {
      await deleteDesireInventoryEntry(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('desireInventory.genericDeleteError'));
      load(); // revert optimistic removal on failure
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.headline}>{t('desireInventory.headline')}</Text>
          <Text style={styles.sub}>{t('desireInventory.notConfigured')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>{t('desireInventory.headline')}</Text>
        <Text style={styles.sub}>{t('desireInventory.sub')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('desireInventory.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={desire}
          onChangeText={setDesire}
          accessibilityLabel={t('desireInventory.placeholder')}
        />

        <Pressable style={styles.cta} onPress={addEntry} accessibilityRole="button">
          <Text style={styles.ctaLabel}>{t('desireInventory.add')}</Text>
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.list}>
          {entries.length === 0 ? (
            <Text style={styles.empty}>{t('desireInventory.nothingAddedYet')}</Text>
          ) : (
            entries.map((e) => (
              <View key={e.id} style={styles.entryCard}>
                <View style={styles.entryMeta}>
                  <Text style={styles.entryRank}>#{e.rank}</Text>
                  {e.used && <Text style={styles.entryUsed}>{t('desireInventory.used')}</Text>}
                </View>
                <Text style={styles.entryContent}>{e.desire}</Text>
                <Pressable onPress={() => removeEntry(e.id)} accessibilityRole="button">
                  <Text style={styles.deleteLink}>{t('desireInventory.delete')}</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
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
  cta: {
    backgroundColor: colors.primary,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaLabel: { fontFamily: fontFamily.bold, color: colors.textInverse, fontSize: 16 },
  errorText: { fontFamily: fontFamily.regular, color: colors.error, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  list: { gap: 12 },
  empty: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  entryCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 16,
    ...card.shadow,
  },
  entryMeta: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  entryRank: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  entryUsed: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 11 },
  entryContent: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 15, marginBottom: 8 },
  deleteLink: { fontFamily: fontFamily.semiBold, color: colors.error, fontSize: 13 },
});
