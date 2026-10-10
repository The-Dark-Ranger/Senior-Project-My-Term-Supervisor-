import type { Role } from '@/types';

/** Identity returned by an auth backend (before a role is resolved). */
export interface AuthAccount {
  uid: string;
  email: string;
  name: string;
}

export interface AuthBackend {
  readonly mode: 'firebase' | 'demo';
  /** Calls `listener` with the current account and on every change. Returns an unsubscribe function. */
  subscribe(listener: (account: AuthAccount | null) => void): () => void;
  signIn(email: string, password: string): Promise<AuthAccount>;
  signUp(name: string, email: string, password: string): Promise<AuthAccount>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** Short-lived ID token proving the current session to the server (`null` in demo mode). */
  getIdToken(): Promise<string | null>;
  roleOf(account: AuthAccount): Role;
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/user-not-found': 'Invalid email or password.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use': 'This email is already registered. Please log in instead.',
  'auth/weak-password': 'Password must be at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/configuration-not-found':
    'Email/Password sign-in is not enabled for this Firebase project. Enable it in the Firebase console.',
  'auth/not-supervisor': 'This account does not have supervisor access. Use the Student Portal instead.',
  'auth/not-student': 'This is a supervisor account. Please use the Supervisor Portal.',
  'auth/reset-unavailable': 'Password reset is not available in demo mode. Demo accounts use the password "demo1234".',
};

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

export const MIN_PASSWORD_LENGTH = 8;
