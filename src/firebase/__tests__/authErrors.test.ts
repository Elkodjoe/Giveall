import { mapAuthErrorCode, validateCredentials, isAnonymousUser } from '../authErrors';
import en from '../../i18n/locales/en.json';

// The auth layer returns i18n keys, never English strings (same rule as the
// engine modules). These tests pin the Firebase-code -> key mapping so a
// reworded/removed locale key or a swapped case can't silently regress into
// a raw `auth/...` string reaching the UI.

describe('mapAuthErrorCode', () => {
  const cases: Array<[string, string]> = [
    ['auth/invalid-email', 'account.errInvalidEmail'],
    ['auth/weak-password', 'account.errWeakPassword'],
    ['auth/email-already-in-use', 'account.errEmailInUse'],
    ['auth/credential-already-in-use', 'account.errEmailInUse'],
    ['auth/account-exists-with-different-credential', 'account.errEmailInUse'],
    ['auth/wrong-password', 'account.errWrongPassword'],
    ['auth/invalid-credential', 'account.errWrongPassword'],
    ['auth/user-not-found', 'account.errWrongPassword'],
    ['auth/requires-recent-login', 'account.errRequiresRecentLogin'],
    ['auth/operation-not-allowed', 'account.errNotConfigured'],
    ['auth/configuration-not-found', 'account.errNotConfigured'],
  ];

  it.each(cases)('maps %s -> %s', (code, key) => {
    expect(mapAuthErrorCode(code)).toBe(key);
  });

  it('falls back to the generic key for unknown or missing codes', () => {
    expect(mapAuthErrorCode('auth/some-future-code')).toBe('account.errGeneric');
    expect(mapAuthErrorCode(undefined)).toBe('account.errGeneric');
  });

  it('every key it can return exists in the English locale', () => {
    const keys = new Set(cases.map(([, k]) => k));
    keys.add('account.errGeneric');
    for (const dotted of keys) {
      const leaf = dotted.split('.').reduce<any>((o, k) => o?.[k], en);
      expect(typeof leaf).toBe('string');
    }
  });
});

describe('validateCredentials', () => {
  it('accepts a well-formed email and a 6+ char password', () => {
    expect(validateCredentials('a@b.co', '123456')).toBeNull();
    expect(validateCredentials('  a@b.co  ', 'longenough')).toBeNull();
  });

  it('rejects a malformed email before password length', () => {
    expect(validateCredentials('not-an-email', '123456')).toBe('account.errInvalidEmail');
    expect(validateCredentials('a@b', '123456')).toBe('account.errInvalidEmail');
  });

  it('rejects a short password', () => {
    expect(validateCredentials('a@b.co', '12345')).toBe('account.errWeakPassword');
  });
});

describe('isAnonymousUser', () => {
  it('is true only for an anonymous user', () => {
    expect(isAnonymousUser(null)).toBe(false);
    expect(isAnonymousUser({ isAnonymous: true })).toBe(true);
    expect(isAnonymousUser({ isAnonymous: false })).toBe(false);
  });
});
