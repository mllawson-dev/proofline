import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Server-side Firebase with full access. Used only by the proof API routes, which do their own checks:
// a valid signed link for customers, a verified ID token and role for staff.

let app: App | undefined;

function adminApp(): App {
  if (app) return app;
  if (getApps().length) return (app = getApps()[0]!);
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set. See docs/going-live.md.');
  app = initializeApp({ credential: cert(JSON.parse(raw) as Parameters<typeof cert>[0]) });
  return app;
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());

export function proofLinkSecret(): string {
  const secret = process.env.PROOF_LINK_SECRET;
  if (!secret) throw new Error('PROOF_LINK_SECRET is not set. See docs/going-live.md.');
  return secret;
}

/** True when the server has what the proof routes need; otherwise they answer 503 instead of crashing. */
export function serverConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT && (process.env.PROOF_LINK_SECRET?.length ?? 0) >= 32);
}
