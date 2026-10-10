'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authMode } from '@/lib/config';
import { getFirebaseAuth } from '@/lib/firebase';
import { createDemoBackend } from '@/lib/auth/demo-backend';
import { createFirebaseBackend } from '@/lib/auth/firebase-backend';
import { AuthError, type AuthAccount, type AuthBackend } from '@/lib/auth/types';
import { ensureDemoData, ensureStudentProfile } from '@/lib/store';
import type { AppUser, Role } from '@/types';

interface SignUpInput {
  name: string;
  email: string;
  password: string;
  year: number;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  mode: 'firebase' | 'demo';
  signIn(email: string, password: string, portal: Role): Promise<AppUser>;
  signUp(input: SignUpInput): Promise<AppUser>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  getIdToken(): Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function createBackend(): AuthBackend {
  const auth = getFirebaseAuth();
  return auth ? createFirebaseBackend(auth) : createDemoBackend();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Created lazily on the client so Firebase is never initialised during server rendering.
  const backendRef = useRef<AuthBackend | null>(null);
  const getBackend = useCallback(() => (backendRef.current ??= createBackend()), []);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  /** Academic year chosen during sign-up, used when the new student's profile is created. */
  const pendingYear = useRef<number | null>(null);

  const toUser = useCallback(
    (account: AuthAccount): AppUser => ({ ...account, role: getBackend().roleOf(account) }),
    [getBackend],
  );

  useEffect(() => {
    const backend = getBackend();
    if (backend.mode === 'demo') ensureDemoData();
    return backend.subscribe(account => {
      const next = account ? toUser(account) : null;
      if (next?.role === 'student') ensureStudentProfile(next, pendingYear.current ?? 1);
      setUser(next);
      setLoading(false);
    });
  }, [getBackend, toUser]);

  const signIn = useCallback(
    async (email: string, password: string, portal: Role) => {
      const backend = getBackend();
      const account = await backend.signIn(email.trim(), password);
      const signedIn = toUser(account);
      if (signedIn.role !== portal) {
        await backend.signOut();
        throw new AuthError(portal === 'supervisor' ? 'auth/not-supervisor' : 'auth/not-student');
      }
      return signedIn;
    },
    [getBackend, toUser],
  );

  const signUp = useCallback(
    async ({ name, email, password, year }: SignUpInput) => {
      pendingYear.current = year;
      try {
        const signedUp = toUser(await getBackend().signUp(name.trim(), email.trim(), password));
        ensureStudentProfile(signedUp, year);
        setUser(signedUp);
        return signedUp;
      } finally {
        pendingYear.current = null;
      }
    },
    [getBackend, toUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode: authMode,
      signIn,
      signUp,
      signOut: () => getBackend().signOut(),
      resetPassword: email => getBackend().sendPasswordReset(email.trim()),
      getIdToken: () => getBackend().getIdToken(),
    }),
    [user, loading, getBackend, signIn, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
