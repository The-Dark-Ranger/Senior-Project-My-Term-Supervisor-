import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { supervisorEmails } from '@/lib/config';
import type { AuthAccount, AuthBackend } from './types';

function toAccount(user: User, nameOverride?: string): AuthAccount {
  const email = user.email ?? '';
  return {
    uid: user.uid,
    email,
    name: nameOverride || user.displayName || email.split('@')[0] || 'User',
  };
}

export function createFirebaseBackend(auth: Auth): AuthBackend {
  return {
    mode: 'firebase',
    subscribe: listener => onAuthStateChanged(auth, user => listener(user ? toAccount(user) : null)),
    async signIn(email, password) {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return toAccount(user);
    },
    async signUp(name, email, password) {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      return toAccount(user, name);
    },
    signOut: () => signOut(auth),
    sendPasswordReset: email => sendPasswordResetEmail(auth, email),
    getIdToken: async () => (auth.currentUser ? auth.currentUser.getIdToken() : null),
    roleOf: account => (supervisorEmails.has(account.email.toLowerCase()) ? 'supervisor' : 'student'),
  };
}
