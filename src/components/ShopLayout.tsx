import { AppShell } from '@/components/AppShell';
import { repository } from '@/lib/data/memory';
import { liveMode } from '@/lib/firebase/env';
import { LiveShop } from './LiveShop';

/** Staff screens: navigation rail plus workspace. Each staff section's layout.tsx re-exports this; the customer proof link does not. */
export function ShopLayout({ children }: { children: React.ReactNode }) {
  if (liveMode) {
    return (
      <LiveShop>
        <AppShell live>{children}</AppShell>
      </LiveShop>
    );
  }
  return <AppShell today={repository.today()}>{children}</AppShell>;
}
