import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, ensureSignedIn } from '../firebase/auth';

interface AuthContextValue {
  uid: string | null;
  /** true for a throwaway anonymous session, false once a real account is linked. */
  isAnonymous: boolean;
  /** the linked account email, or null while still anonymous. */
  email: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  uid: null,
  isAnonymous: true,
  email: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    uid: null,
    isAnonymous: true,
    email: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    // Kick off the anonymous sign-in (no-op if already signed in). The
    // listener below is the source of truth for state and — unlike a
    // one-shot read — also fires after linkEmailPassword / signInWithEmail
    // so the UI reflects the upgrade without a reload.
    ensureSignedIn().catch(() => {
      // handled by the listener / graceful-degradation path
    });

    if (!auth) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (cancelled) return;
      setState({
        uid: user?.uid ?? null,
        isAnonymous: user?.isAnonymous ?? true,
        email: user?.email ?? null,
        isLoading: false,
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
