import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from '@/lib/config';

let auth: Auth | null = null;

/** Lazily initialises Firebase. Returns `null` when Firebase is not configured (demo mode). */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!auth) {
    const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}
