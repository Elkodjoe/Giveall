import {
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
  // @ts-expect-error — exists on firebase/auth's "react-native" export
  // condition, which Metro resolves correctly at runtime; Expo's base
  // tsconfig (moduleResolution: "node") can't see conditional exports, so
  // tsc reports this as missing even though the app builds and runs fine.
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseApp } from './config';

// Firebase JS SDK requires explicit AsyncStorage-backed persistence on
// React Native — without it, auth state (including the anonymous uid) does
// not survive an app restart, silently creating a new user each launch.
export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

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
export function ensureSignedIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          signInAnonymously(auth).then((cred) => resolve(cred.user)).catch(reject);
        }
      },
      reject,
    );
  });
}
