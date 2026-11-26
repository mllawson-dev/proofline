'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './env';

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | undefined;

/** The browser's Firebase app, created once. Only called in live mode. */
export function firebase() {
  if (cached) return cached;
  if (!firebaseConfig) throw new Error('Firebase is not configured. See docs/going-live.md.');
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}
