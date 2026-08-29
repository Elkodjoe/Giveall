import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/state/AuthContext';
import { isFirebaseConfigured } from '../src/firebase/config';
import { deleteAllMemoryVaultEntries } from '../src/firebase/collections';
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
