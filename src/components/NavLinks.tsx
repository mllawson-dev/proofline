'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { canSee, ROLE_LABELS, type Screen } from '@/lib/roles';
import { useShop } from '@/lib/shop';
import type { Role } from '@/lib/types';
import styles from './AppShell.module.css';

const NAV: { href: string; label: string; screen: Screen }[] = [
  { href: '/jobs', label: 'Jobs', screen: 'jobs' },
  { href: '/board', label: 'Board', screen: 'board' },
  { href: '/proofs', label: 'Proofs', screen: 'proofs' },
  { href: '/dashboard', label: 'Dashboard', screen: 'dashboard' }
];

const ROLE_ORDER: Role[] = ['manager', 'counter', 'designer', 'production'];

export function NavLinks() {
  const path = usePathname();
  const { jobs, role } = useShop();
  const waiting = jobs.filter((j) => j.stage === 'awaiting-approval').length;

  return (
    <nav aria-label="Main">
      <ul className={styles.nav}>
        {NAV.filter((item) => canSee(role, item.screen)).map((item) => {
          const current = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={current ? 'page' : undefined}>
                {item.label}
                {item.href === '/proofs' && waiting > 0 && (
                  <span className={styles.badge}>
                    {waiting}
                    <span className="visually-hidden"> waiting</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Demo: try the app as each person in the shop. In live mode the role comes from the signed-in account. */
export function RoleSwitcher() {
  const { role, switchRole, staff, me } = useShop();
  if (!switchRole) {
    return (
      <div className={styles.whoami}>
        <p>
          Signed in as <strong>{me.name}</strong>, {ROLE_LABELS[role].toLowerCase()}
        </p>
        <button
          type="button"
          className={styles.reset}
          onClick={async () => {
            // Loaded on demand so the demo never ships the Firebase SDK.
            const [{ signOut }, { firebase }] = await Promise.all([import('firebase/auth'), import('@/lib/firebase/client')]);
            await signOut(firebase().auth);
          }}
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <label className={styles.roleSwitch}>
      <span>Viewing as</span>
      <select value={role} onChange={(e) => switchRole(e.target.value as Role)}>
        {ROLE_ORDER.map((r) => {
          const person = staff.find((s) => s.role === r);
          return (
            <option key={r} value={r}>
              {person ? `${person.name}, ${ROLE_LABELS[r].toLowerCase()}` : ROLE_LABELS[r]}
            </option>
          );
        })}
      </select>
    </label>
  );
}

/** Shown only after the visitor changes something, so they can get back to the published snapshot. */
export function ResetDemo() {
  const { edited, reset } = useShop();
  if (!edited || !reset) return null;
  return (
    <button type="button" className={styles.reset} onClick={reset}>
      Reset demo
    </button>
  );
}
