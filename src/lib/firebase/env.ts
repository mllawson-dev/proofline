// Live mode turns on only when every public Firebase setting is present. Without them the app runs the
// sample-data demo, which is what the public portfolio deployment does (docs/decisions/0003-firebase.md).

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

/**
 * Next.js inlines NEXT_PUBLIC_ values at build time only when they are written out in full like this,
 * so the four names stay spelled out rather than built in a loop.
 */
export function readFirebaseConfig(env: Record<string, string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}): FirebasePublicConfig | undefined {
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim()
  };
  return config.apiKey && config.authDomain && config.projectId && config.appId ? (config as FirebasePublicConfig) : undefined;
}

export const firebaseConfig = readFirebaseConfig();
export const liveMode = Boolean(firebaseConfig);
