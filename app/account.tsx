import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/state/AuthContext';
import { isFirebaseConfigured } from '../src/firebase/config';
import {
  linkEmailPassword,
  signInWithEmail,
  signOutToAnonymous,
  AuthActionError,
} from '../src/firebase/auth';
import { colors, radius, button, fontFamily } from '../src/theme/tokens';

// Account — turns the throwaway anonymous session (docs/01-onboarding-flow.md:
// "asks come after value, not before") into a real email/password login so
// data survives a reinstall or a new phone. Uses Firebase linkWithCredential
// under the hood, keeping the same uid. Email/Password is the only provider
// wired up on purpose: no Apple Developer account, no extra OAuth config.
export default function AccountScreen() {
  const { t } = useTranslation();
  const { isAnonymous, email: linkedEmail } = useAuth();

  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const disabled = !isFirebaseConfigured;

  const run = async (action: () => Promise<unknown>, successKey: string | null) => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      await action();
      if (successKey) setStatus(t(successKey));
      setPassword('');
    } catch (err) {
      if (err instanceof AuthActionError) setError(t(err.key));
      else setError(t('account.errGeneric'));
    } finally {
      setBusy(false);
    }
  };

  // Already upgraded: just show which account and let them sign out.
  if (!isAnonymous) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.headline}>{t('account.linkedHeadline')}</Text>
          <Text style={styles.blurb}>{t('account.linkedBlurb', { email: linkedEmail ?? '' })}</Text>
          <Pressable
            style={[styles.secondaryButton, busy && styles.buttonBusy]}
            onPress={() => run(() => signOutToAnonymous(), null)}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonLabel}>{t('account.signOut')}</Text>
          </Pressable>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isSignUp = mode === 'signUp';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>{t('account.headline')}</Text>
        <Text style={styles.blurb}>{t('account.anonBlurb')}</Text>

        <Text style={styles.label}>{t('account.emailLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('account.emailPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!disabled && !busy}
          accessibilityLabel={t('account.emailLabel')}
        />

        <Text style={styles.label}>{t('account.passwordLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('account.passwordPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          textContentType={isSignUp ? 'newPassword' : 'password'}
          editable={!disabled && !busy}
          accessibilityLabel={t('account.passwordLabel')}
        />

        <Pressable
          style={[styles.cta, (disabled || busy) && styles.buttonBusy]}
          onPress={() =>
            run(
              () =>
                isSignUp
                  ? linkEmailPassword(email, password)
                  : signInWithEmail(email, password),
              isSignUp ? 'account.savedToast' : null,
            )
          }
          disabled={disabled || busy}
          accessibilityRole="button"
        >
          <Text style={styles.ctaLabel}>
            {busy
              ? t('account.saving')
              : isSignUp
                ? t('account.saveAccount')
                : t('account.signIn')}
          </Text>
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {status && <Text style={styles.statusText}>{status}</Text>}

        <Pressable
          onPress={() => {
            setMode(isSignUp ? 'signIn' : 'signUp');
            setError(null);
            setStatus(null);
          }}
          accessibilityRole="button"
          style={styles.switchLink}
        >
          <Text style={styles.switchLinkText}>
            {isSignUp ? t('account.haveAccount') : t('account.backToSignUp')}
          </Text>
          {isSignUp && <Text style={styles.switchLinkCta}>{t('account.signInCta')}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48 },
  headline: { fontFamily: fontFamily.bold, color: colors.textPrimary, fontSize: 22, lineHeight: 28, marginBottom: 8 },
  blurb: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 24 },
  label: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
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
    marginBottom: 16,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  ctaLabel: { fontFamily: fontFamily.bold, color: colors.textInverse, fontSize: 16 },
  buttonBusy: { opacity: 0.6 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: button.radius,
    height: button.height,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonLabel: { fontFamily: fontFamily.semiBold, color: colors.textPrimary, fontSize: 15 },
  errorText: { fontFamily: fontFamily.regular, color: colors.error, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  statusText: { fontFamily: fontFamily.regular, color: colors.successText, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  switchLink: { marginTop: 8, alignItems: 'center' },
  switchLinkText: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  switchLinkCta: { fontFamily: fontFamily.semiBold, color: colors.primary, fontSize: 14, marginTop: 4 },
});
