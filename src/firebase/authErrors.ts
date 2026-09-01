// Pure auth helpers — deliberately free of `firebase/auth` and any
// react-native import so they're unit-testable under the plain-node jest
// preset (importing auth.ts pulls in react-native, which jest can't
// transform). auth.ts re-exports everything here.

// i18next keys (see src/i18n/locales/*.json "account"). The auth layer
// returns keys, never English strings, exactly like decisionMatrix.ts /
// recalibration.ts keep the engine framework-agnostic.
export type AuthErrorKey =
  | 'account.errInvalidEmail'
  | 'account.errWeakPassword'
  | 'account.errEmailInUse'
  | 'account.errWrongPassword'
  | 'account.errRequiresRecentLogin'
  | 'account.errNotConfigured'
  | 'account.errGeneric';

/**
 * Maps a Firebase Auth error `code` to a user-facing i18n key. Unknown
 * codes fall back to the generic key rather than leaking `auth/...`
 * internals into the UI.
 */
export function mapAuthErrorCode(code: string | undefined): AuthErrorKey {
  switch (code) {
    case 'auth/invalid-email':
      return 'account.errInvalidEmail';
    case 'auth/weak-password':
      return 'account.errWeakPassword';
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return 'account.errEmailInUse';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'account.errWrongPassword';
    case 'auth/requires-recent-login':
      return 'account.errRequiresRecentLogin';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'account.errNotConfigured';
    default:
      return 'account.errGeneric';
  }
}

/**
 * Client-side pre-flight before hitting Firebase: catches a bad email shape
 * or a too-short password without a round trip. Returns an i18n key or null
 * when the input looks acceptable. Firebase still does the authoritative
 * validation server-side.
 */
export function validateCredentials(email: string, password: string): AuthErrorKey | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'account.errInvalidEmail';
  if (password.length < 6) return 'account.errWeakPassword';
  return null;
}

export function isAnonymousUser(user: { isAnonymous: boolean } | null | undefined): boolean {
  return Boolean(user?.isAnonymous);
}

/** Thrown by the account calls in auth.ts; `.key` is a ready-to-render i18n key. */
export class AuthActionError extends Error {
  key: AuthErrorKey;
  constructor(key: AuthErrorKey) {
    super(key);
    this.key = key;
    this.name = 'AuthActionError';
  }
}

export function toAuthActionError(err: unknown): AuthActionError {
  const code = (err as { code?: string } | null)?.code;
  return new AuthActionError(mapAuthErrorCode(code));
}
