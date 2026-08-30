import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/state/AuthContext';
import { isFirebaseConfigured } from '../src/firebase/config';
import {
  getAllMemoryVaultEntries,
  addMemoryVaultEntry,
  deleteMemoryVaultEntry,
  type MemoryVaultEntryWithId,
} from '../src/firebase/collections';
import type { MemoryVaultDoc } from '../src/firebase/types';
import { colors, radius, card, button, fontFamily } from '../src/theme/tokens';

// Memory Vault — specific details logged about a partner/crush, used by
// decisionMatrix.ts's "Recall Detail" prescription when seen_score is low
// (see docs/02-love-os-brain.md #2). Without any entries, that prescription
// falls back to a generic "ask an open question" line — this screen is
// what makes it actually personal. Entirely Firestore-backed; there's no
// client-only demo path here since there's nothing meaningful to fake for
// "a detail about your specific partner."
const TYPES: MemoryVaultDoc['type'][] = ['detail', 'joke', 'interest', 'photo'];
const SENTIMENTS: MemoryVaultDoc['sentiment'][] = ['warm', 'neutral', 'tense'];

export default function MemoryVaultScreen() {
  const { t } = useTranslation();
  const { uid } = useAuth();
  const [entries, setEntries] = useState<MemoryVaultEntryWithId[]>([]);
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryVaultDoc['type']>('detail');
  const [sentiment, setSentiment] = useState<MemoryVaultDoc['sentiment']>('warm');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isFirebaseConfigured || !uid) return;
    getAllMemoryVaultEntries(uid)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : t('memoryVault.genericLoadError')));
  }, [uid, t]);

  useEffect(load, [load]);
  useFocusEffect(load); // refresh when navigating back after deleting/adding

  const addEntry = async () => {
    if (!content.trim() || !isFirebaseConfigured || !uid) return;
    setError(null);
    try {
      await addMemoryVaultEntry({
        userId: uid,
        type,
        content: content.trim(),
        date: new Date().toISOString().slice(0, 10),
        sentiment,
        usedInGeneration: false,
      });
      setContent('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('memoryVault.genericAddError'));
    }
  };

  const removeEntry = async (id: string) => {
    setEntries((es) => es.filter((e) => e.id !== id)); // optimistic
    try {
      await deleteMemoryVaultEntry(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('memoryVault.genericDeleteError'));
      load(); // revert optimistic removal on failure
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.headline}>{t('memoryVault.headline')}</Text>
          <Text style={styles.sub}>{t('memoryVault.notConfigured')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>{t('memoryVault.headline')}</Text>
        <Text style={styles.sub}>{t('memoryVault.sub')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('memoryVault.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
        />

        <View style={styles.chipRow}>
          {TYPES.map((mvType) => (
            <Pressable key={mvType} style={[styles.chip, type === mvType && styles.chipSelected]} onPress={() => setType(mvType)}>
              <Text style={[styles.chipText, type === mvType && styles.chipTextSelected]}>{t(`memoryVault.types.${mvType}`)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.chipRow}>
          {SENTIMENTS.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, sentiment === s && styles.chipSelected]}
              onPress={() => setSentiment(s)}
            >
              <Text style={[styles.chipText, sentiment === s && styles.chipTextSelected]}>{t(`memoryVault.sentiments.${s}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={addEntry}>
          <Text style={styles.ctaLabel}>{t('memoryVault.save')}</Text>
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.list}>
          {entries.length === 0 ? (
            <Text style={styles.empty}>{t('memoryVault.nothingSavedYet')}</Text>
          ) : (
            entries.map((e) => (
              <View key={e.id} style={styles.entryCard}>
                <View style={styles.entryMeta}>
                  <Text style={styles.entryType}>{t(`memoryVault.types.${e.type}`)}</Text>
                  {e.usedInGeneration && <Text style={styles.entryUsed}>{t('memoryVault.used')}</Text>}
                </View>
                <Text style={styles.entryContent}>{e.content}</Text>
                <Pressable onPress={() => removeEntry(e.id)}>
                  <Text style={styles.deleteLink}>{t('memoryVault.delete')}</Text>
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
  cta: {
    backgroundColor: colors.primary,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  entryType: {
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
