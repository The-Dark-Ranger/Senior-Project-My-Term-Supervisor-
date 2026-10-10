/**
 * Local demo authentication used when Firebase is not configured.
 *
 * Accounts live in the browser's localStorage. This exists so the project can be
 * cloned and explored without any cloud setup - it is NOT a secure auth system.
 */
import type { Role } from '@/types';
import { readJson, writeJson, removeKey, onStorageKeyChange } from '@/lib/local-storage';
import { createId } from '@/lib/utils';
import { AuthError, MIN_PASSWORD_LENGTH, type AuthAccount, type AuthBackend } from './types';

const ACCOUNTS_KEY = 'term-supervisor:demo-accounts';
const SESSION_KEY = 'term-supervisor:demo-session';

export const DEMO_PASSWORD = 'demo1234';

interface DemoAccount extends AuthAccount {
  role: Role;
  passwordHash: string;
}

export interface DemoAccountSeed {
  uid: string;
  email: string;
  name: string;
  role: Role;
  /** Academic year for seeded students. */
  year?: number;
}

export const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  { uid: 'demo-supervisor', email: 'supervisor@example.com', name: 'Dr. Demo Supervisor', role: 'supervisor' },
  { uid: 'demo-student-1', email: 'student1@example.com', name: 'Layla Hassan', role: 'student', year: 1 },
  { uid: 'demo-student-2', email: 'student2@example.com', name: 'Omar Khalid', role: 'student', year: 2 },
  { uid: 'demo-student-3', email: 'student3@example.com', name: 'Noor Saleh', role: 'student', year: 3 },
  { uid: 'demo-student-4', email: 'student4@example.com', name: 'Yusuf Rahman', role: 'student', year: 4 },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hashPassword(email: string, password: string): Promise<string> {
  const input = `${email.toLowerCase()}:${password}`;
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
  // crypto.subtle is unavailable on insecure origins (e.g. http://192.168.x.x) - fall back to a simple hash.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return `fnv-${(h >>> 0).toString(16)}`;
}

async function loadAccounts(): Promise<DemoAccount[]> {
  const stored = readJson<DemoAccount[]>(ACCOUNTS_KEY, []);
  const missing = DEMO_ACCOUNTS.filter(seed => !stored.some(a => a.uid === seed.uid));
  if (missing.length === 0) return stored;
  const seeded = await Promise.all(
    missing.map(async seed => ({
      uid: seed.uid,
      email: seed.email,
      name: seed.name,
      role: seed.role,
      passwordHash: await hashPassword(seed.email, DEMO_PASSWORD),
    })),
  );
  const accounts = [...seeded, ...stored];
  writeJson(ACCOUNTS_KEY, accounts);
  return accounts;
}

function currentAccount(): AuthAccount | null {
  const uid = readJson<string | null>(SESSION_KEY, null);
  if (!uid) return null;
  const accounts = readJson<DemoAccount[]>(ACCOUNTS_KEY, []);
  const account = accounts.find(a => a.uid === uid) ?? null;
  return account ? { uid: account.uid, email: account.email, name: account.name } : null;
}

const listeners = new Set<(account: AuthAccount | null) => void>();
function notify() {
  const account = currentAccount();
  listeners.forEach(l => l(account));
}

export function createDemoBackend(): AuthBackend {
  return {
    mode: 'demo',
    subscribe(listener) {
      listeners.add(listener);
      // Seed accounts once, then report the current session.
      void loadAccounts().then(() => listener(currentAccount()));
      const stop = onStorageKeyChange([SESSION_KEY, ACCOUNTS_KEY], () => listener(currentAccount()));
      return () => {
        listeners.delete(listener);
        stop();
      };
    },
    async signIn(email, password) {
      const accounts = await loadAccounts();
      const account = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
      if (!account || account.passwordHash !== (await hashPassword(account.email, password))) {
        throw new AuthError('auth/invalid-credential');
      }
      writeJson(SESSION_KEY, account.uid);
      notify();
      return { uid: account.uid, email: account.email, name: account.name };
    },
    async signUp(name, email, password) {
      const normalized = email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(normalized)) throw new AuthError('auth/invalid-email');
      if (password.length < MIN_PASSWORD_LENGTH) throw new AuthError('auth/weak-password');
      const accounts = await loadAccounts();
      if (accounts.some(a => a.email.toLowerCase() === normalized)) throw new AuthError('auth/email-already-in-use');
      const account: DemoAccount = {
        uid: `demo-${createId()}`,
        email: normalized,
        name: name.trim(),
        role: 'student',
        passwordHash: await hashPassword(normalized, password),
      };
      writeJson(ACCOUNTS_KEY, [...accounts, account]);
      writeJson(SESSION_KEY, account.uid);
      notify();
      return { uid: account.uid, email: account.email, name: account.name };
    },
    async signOut() {
      removeKey(SESSION_KEY);
      notify();
    },
    async sendPasswordReset() {
      throw new AuthError('auth/reset-unavailable');
    },
    async getIdToken() {
      return null;
    },
    roleOf(account) {
      const accounts = readJson<DemoAccount[]>(ACCOUNTS_KEY, []);
      return accounts.find(a => a.uid === account.uid)?.role ?? 'student';
    },
  };
}
