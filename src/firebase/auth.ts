import {
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  browserLocalPersistence,
  type User,
  // @ts-expect-error — exists on firebase/auth's "react-native" export
  // condition, which Metro resolves correctly at runtime on iOS/Android;
  // Expo's base tsconfig (moduleResolution: "node") can't see conditional
  // exports, so tsc reports this as missing even though it builds fine.
  // On web this name is genuinely undefined at runtime (RN-only API) — see
  // the Platform.OS check below, which is why this must never be called
  // unconditionally.
  getReactNativePersistence,
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseApp, isFirebaseConfigured } from './config';
import { AuthActionError, toAuthActionError, validateCredentials } from './authErrors';

export {
  type AuthErrorKey,
  AuthActionError,
  isAnonymousUser,
  mapAuthErrorCode,
  validateCredentials,
} from './authErrors';

// Firebase JS SDK requires explicit persistence config per platform: RN
// needs AsyncStorage-backed persistence (without it, auth state — including
// the anonymous uid — doesn't survive an app restart, silently creating a
// new user each launch); web has its own browserLocalPersistence and does
// not export getReactNativePersistence at all (calling it unconditionally
// crashes the app on web with "is not a function").
//
// initializeAuth() itself throws synchronously with an empty apiKey (before
// a Firebase project is provisioned — see docs/06-firebase-provisioning.md
// — EXPO_PUBLIC_* env vars are unset), which would crash the whole app at
// module load, not just auth features. Guard it so the app still renders.
export const auth = isFirebaseConfigured
  ? initializeAuth(firebaseApp, {
      persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage),
    })
  : null;

/**
 * MVP auth strategy: anonymous sign-in gives every install a stable uid
 * immediately, satisfying firestore.rules' `request.auth != null` checks
 * without forcing account creation before onboarding's "First Win" moment
 * (see docs/01-onboarding-flow.md — asks come after value, not before).
 *
 * Upgrading an anonymous user to a real account later uses Firebase's
 * linkWithCredential (see linkEmailPassword below) so the uid — and
 * everything already written under it — carries over unchanged. Only
 * email/password is wired up: it needs no third-party developer account
 * (unlike Apple Sign In) and no extra OAuth client config (unlike Google
 * on native). The Email/Password provider must be enabled in the Firebase
 * console (Auth > Sign-in method) — a free toggle. Apple/Google linking
 * can be layered on later with the same linkWithCredential call.
 */
export function ensureSignedIn(): Promise<User | null> {
  if (!auth) {
    // eslint-disable-next-line no-console
    console.warn('Firebase not configured (see docs/06-firebase-provisioning.md) — skipping sign-in.');
    return Promise.resolve(null);
  }
  const signedInAuth = auth;
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      signedInAuth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          signInAnonymously(signedInAuth).then((cred) => resolve(cred.user)).catch(reject);
        }
      },
      reject,
    );
  });
}

/**
 * Upgrades the current anonymous user to a permanent email/password
 * account, keeping the same uid (and therefore every Firestore doc already
 * written under it). After this the user can reinstall / switch devices and
 * get their data back via signInWithEmail below.
 */
export async function linkEmailPassword(email: string, password: string): Promise<User> {
  if (!auth) throw new AuthActionError('account.errNotConfigured');
  const preflight = validateCredentials(email, password);
  if (preflight) throw new AuthActionError(preflight);
  const current = auth.currentUser;
  if (!current) throw new AuthActionError('account.errGeneric');
  try {
    const credential = EmailAuthProvider.credential(email.trim(), password);
    const result = await linkWithCredential(current, credential);
    return result.user;
  } catch (err) {
    throw toAuthActionError(err);
  }
}

/**
 * Signs in a returning user who already linked an account on another
 * device. This replaces the throwaway anonymous session created on this
 * fresh install; the anonymous uid's data (nothing meaningful pre-account)
 * is left orphaned, which is the expected trade-off.
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new AuthActionError('account.errNotConfigured');
  const preflight = validateCredentials(email, password);
  if (preflight) throw new AuthActionError(preflight);
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return result.user;
  } catch (err) {
    throw toAuthActionError(err);
  }
}

/**
 * Signs out of the real account and drops back to a fresh anonymous
 * session, so the app still satisfies firestore.rules' `request.auth != null`
 * checks and never renders in a signed-out limbo state.
 */
export async function signOutToAnonymous(): Promise<User | null> {
  if (!auth) return null;
  await signOut(auth);
  const cred = await signInAnonymously(auth);
  return cred.user;
}
