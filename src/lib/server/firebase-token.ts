/**
 * Verifies Firebase Authentication ID tokens on the server without the Admin SDK,
 * following https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

/** Returns the verified user, or `null` if the token is missing, expired or not issued for `projectId`. */
export async function verifyFirebaseIdToken(token: unknown, projectId: string): Promise<VerifiedFirebaseUser | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      clockTolerance: 30,
    });
    const authTime = typeof payload.auth_time === 'number' ? payload.auth_time : Infinity;
    if (!payload.sub || authTime > Date.now() / 1000 + 30) return null;
    return { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
  } catch {
    return null;
  }
}
