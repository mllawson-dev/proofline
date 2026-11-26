import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@/styles/tokens.css';
import '@/styles/globals.css';
import { DemoStoreProvider } from '@/lib/demo-store';
import { repository } from '@/lib/data/memory';
import { liveMode } from '@/lib/firebase/env';

export const metadata: Metadata = {
  title: { default: 'Proofline', template: '%s · Proofline' },
  description: 'Job tracker for a sign and print shop: intake, proof approval, production and quality check. A portfolio concept by Michael L. Lawson.'
};

export const viewport: Viewport = { themeColor: '#16181D' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {/* Live mode: staff screens get the Firestore store behind sign-in (ShopLayout); the customer link uses the API. */}
        {liveMode ? children : <Demo>{children}</Demo>}
      </body>
    </html>
  );
}

async function Demo({ children }: { children: React.ReactNode }) {
  const [jobs, customers, staff] = await Promise.all([repository.listJobs(), repository.listCustomers(), repository.listStaff()]);
  return (
    <DemoStoreProvider seed={jobs} customers={customers} staff={staff} today={repository.today()}>
      {children}
    </DemoStoreProvider>
  );
}
