import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/state/AuthContext';
import { isFirebaseConfigured } from '../src/firebase/config';
import { getPartnership, requestPartnership, optInToPartnership } from '../src/firebase/collections';
import type { PartnershipDoc } from '../src/firebase/types';
import { colors, radius, card, button, fontFamily } from '../src/theme/tokens';

// Partner Mode — double opt-in linking (docs/03-power-ups.md #3: "Partner
// mode requires explicit double opt-in"). No lookup-by-email exists, so
// linking works by each person sharing their own uid as a connection code
// and entering the other's. The actual pending->active flip only happens
// in functions/src/activatePartnership.ts (a Cloud Function, not deployed
// — see docs/06-firebase-provisioning.md), so this screen can reach "both
// opted in" and correctly keep showing Pending until that's deployed.
export default function PartnerScreen() {
  const { t } = useTranslation();
  const { uid } = useAuth();
  const [partnerCode, setPartnerCode] = useState('');
  const [partnership, setPartnership] = useState<PartnershipDoc | null>(null);
  const [linkedPartnerId, setLinkedPartnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!uid) return;
    await Clipboard.setStringAsync(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const load = useCallback(() => {
    if (!isFirebaseConfigured || !uid || !linkedPartnerId) return;
    getPartnership(uid, linkedPartnerId)
      .then((p) => setPartnership(p ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : t('partner.genericLoadError')));
  }, [uid, linkedPartnerId, t]);

  useFocusEffect(load);

  const connect = async () => {
    const partnerUid = partnerCode.trim();
    if (!partnerUid || !isFirebaseConfigured || !uid) return;
    if (partnerUid === uid) {
      setError(t('partner.ownCodeError'));
      return;
    }
    setError(null);
    setLinkedPartnerId(partnerUid);

    try {
      const existing = await getPartnership(uid, partnerUid);
      if (!existing) {
        // Nobody's requested yet — I'm initiating.
        await requestPartnership(uid, partnerUid);
      } else if (existing.optIns[uid] !== true) {
        // Partner already requested and is waiting on me.
        await optInToPartnership(uid, partnerUid, uid);
      }
      // else: already opted in on my side, nothing to do — just refresh below.
      const updated = await getPartnership(uid, partnerUid);
      setPartnership(updated ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('partner.genericConnectError'));
    }
  };

  const bothOptedIn = partnership ? Object.values(partnership.optIns).every(Boolean) : false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>{t('partner.headline')}</Text>
        <Text style={styles.sub}>{t('partner.sub')}</Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('partner.yourCode')}</Text>
          <Text selectable style={styles.codeValue}>
            {uid ?? '—'}
          </Text>
          <Pressable style={styles.copyButton} onPress={copyCode} disabled={!uid}>
            <Text style={styles.copyButtonLabel}>{copied ? t('partner.copied') : t('partner.copyCode')}</Text>
          </Pressable>
          <Text style={styles.codeHint}>{t('partner.shareHint')}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('partner.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={partnerCode}
          onChangeText={setPartnerCode}
          autoCapitalize="none"
        />

        <Pressable style={styles.cta} onPress={connect}>
          <Text style={styles.ctaLabel}>{t('partner.connect')}</Text>
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {partnership && (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>{t('partner.status')}</Text>
            {partnership.status === 'active' ? (
              <Text style={styles.statusActive}>{t('partner.connected')}</Text>
            ) : bothOptedIn ? (
              <Text style={styles.statusPending}>{t('partner.bothOptedIn')}</Text>
            ) : (
              <Text style={styles.statusPending}>{t('partner.pending')}</Text>
            )}
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
  codeCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 20,
    marginBottom: 20,
    ...card.shadow,
  },
  codeLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  codeValue: { fontFamily: fontFamily.regular, color: colors.textPrimary, fontSize: 14, marginBottom: 8 },
  copyButton: { alignSelf: 'flex-start', marginBottom: 8 },
  copyButtonLabel: { fontFamily: fontFamily.semiBold, color: colors.primary, fontSize: 13 },
  codeHint: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13 },
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
    marginBottom: 16,
  },
  ctaLabel: { fontFamily: fontFamily.bold, color: colors.textInverse, fontSize: 16 },
  errorText: { fontFamily: fontFamily.regular, color: colors.error, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  statusCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: card.radius,
    padding: 20,
    ...card.shadow,
  },
  statusLabel: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusActive: { fontFamily: fontFamily.bold, color: colors.success, fontSize: 16 },
  statusPending: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
