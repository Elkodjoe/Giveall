import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Values come from Expo public env vars (EXPO_PUBLIC_* is inlined at build
// time and safe to ship client-side — see https://docs.expo.dev/guides/environment-variables/).
// Populate a local .env with real values; see .env.example.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Whether real Firebase credentials are present. Until a Firebase project
// is provisioned (see docs/06-firebase-provisioning.md) EXPO_PUBLIC_* env
// vars are unset, and Firebase SDK calls (especially initializeAuth) throw
// synchronously if used with an empty apiKey — auth.ts checks this before
// calling initializeAuth so the app can still render without Firebase
// configured, since nothing in the onboarding flow needs it yet.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
