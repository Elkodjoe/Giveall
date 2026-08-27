import React, { createContext, useContext, useEffect, useState } from 'react';
import { ensureSignedIn } from '../firebase/auth';

interface AuthContextValue {
  uid: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ uid: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    ensureSignedIn()
      .then((user) => {
        if (!cancelled) setUid(user.uid);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={{ uid, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
