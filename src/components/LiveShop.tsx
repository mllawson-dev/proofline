'use client';

import dynamic from 'next/dynamic';

// Loaded only in live mode, so the public demo never downloads the Firebase SDK.
const LiveStoreProvider = dynamic(() => import('@/lib/firebase/live-store').then((m) => m.LiveStoreProvider), {
  ssr: false,
  loading: () => (
    <p style={{ padding: '2rem' }} role="status">
      Loading the shop…
    </p>
  )
});

export function LiveShop({ children }: { children: React.ReactNode }) {
  return <LiveStoreProvider>{children}</LiveStoreProvider>;
}
