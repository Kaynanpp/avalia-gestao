import { logError } from '@/lib/observability/logger';
// Firebase Admin SDK - Server-side only
// This file must NEVER be imported in client-side code
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

function initializeAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

  // Next.js imports route modules while collecting build metadata. Initialize
  // a credential-free Admin app in that phase so production private keys stay
  // out of image builds and build-time route inspection cannot access data.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return initializeApp({
      projectId: projectId || 'demo-avalia-gestao',
    });
  }

  if (useEmulator) {
    // In emulator mode, use project ID only (no credentials needed)
    process.env.FIRESTORE_EMULATOR_HOST = `${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080'}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= `${process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099'}`;

    return initializeApp({
      projectId: projectId || 'demo-avalia-gestao',
    });
  }

  // Fail closed if local emulator variables leaked into a real deployment.
  // Firebase Admin SDK silently honors these variables even with production credentials.
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error(
      'Firebase emulator host variables are set while emulator mode is disabled. ' +
      'Remove FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST before production startup.'
    );
  }

  // Production: use service account credentials
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, ' +
      'FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.'
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// Initialize on module load (server-side)
try {
  adminApp = initializeAdminApp();
} catch (error) {
  logError('firebase_initialization_failed', error);
  throw error;
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

export default adminApp;
