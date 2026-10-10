/**
 * Public (browser-visible) runtime configuration.
 *
 * `NEXT_PUBLIC_*` variables are inlined at build time, so each one must be
 * referenced literally. Nothing secret belongs here.
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** Firebase Authentication is used when configured; otherwise the app runs in local demo mode. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

export const authMode: 'firebase' | 'demo' = isFirebaseConfigured ? 'firebase' : 'demo';

/**
 * Emails allowed to use the supervisor portal in Firebase mode (comma separated).
 * This is a client-side convenience gate for the prototype; production RBAC
 * should use Firebase custom claims enforced by security rules.
 */
export const supervisorEmails: ReadonlySet<string> = new Set(
  (process.env.NEXT_PUBLIC_SUPERVISOR_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
);

/** Display name shown to students for their academic supervisor. */
export const supervisorDisplayName =
  process.env.NEXT_PUBLIC_SUPERVISOR_NAME?.trim() || (authMode === 'demo' ? 'Dr. Demo Supervisor' : 'Academic Supervisor');
