'use client';

import Link from 'next/link';
import { canSee, ROLE_LABELS, type Screen } from '@/lib/roles';
import { useShop } from '@/lib/shop';
import styles from './RoleGate.module.css';

const NAMES: Record<Screen, string> = { jobs: 'jobs list', board: 'production board', proofs: 'proofs list', dashboard: 'shop dashboard' };

/** Keeps each screen to the roles that use it. The Firestore rules enforce the same split on the data. */
export function RoleGate({ screen, children }: { screen: Screen; children: React.ReactNode }) {
  const { role, switchRole } = useShop();
  if (canSee(role, screen)) return <>{children}</>;
  return (
    <section className={styles.gate} aria-labelledby="gate-heading">
      <p className="label">{ROLE_LABELS[role]}</p>
      <h1 id="gate-heading">The {NAMES[screen]} isn’t part of your view</h1>
      <p>
        A {ROLE_LABELS[role].toLowerCase()} works from the <Link href="/board">board</Link> and the <Link href="/jobs">jobs list</Link>.
        {screen === 'dashboard' && ' The dashboard is for the shop manager.'}
      </p>
      {switchRole && (
        <button type="button" onClick={() => switchRole('manager')}>
          View as the shop manager
        </button>
      )}
    </section>
  );
}
