import {
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
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
 * Upgrading an anonymous user to a real account later (email link, Apple,
 * Google) should use Firebase's linkWithCredential so the uid — and
 * everything already written under it — carries over unchanged. That
 * upgrade path is not implemented yet.
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
