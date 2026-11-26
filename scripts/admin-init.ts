// Shared setup for the command-line scripts. Not for the app: src/lib/firebase/admin.ts is the server's copy.
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';

export function initAdmin() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT ?? (path ? readFileSync(path, 'utf8') : undefined);
  if (!raw) {
    console.error('Set FIREBASE_SERVICE_ACCOUNT (the JSON) or GOOGLE_APPLICATION_CREDENTIALS (a path to it). See docs/going-live.md.');
    process.exit(1);
  }
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}
