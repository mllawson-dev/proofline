import Link from 'next/link';
import { formatLongDate } from '@/lib/format';
import { NavLinks, ResetDemo, RoleSwitcher } from './NavLinks';
import styles from './AppShell.module.css';

/** Registration mark: the crosshair printers use to line up plates. The product's only ornament. */
function RegistrationMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={styles.mark}>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 1.5v21M1.5 12h21" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function AppShell({ today, live = false, children }: { today?: string; live?: boolean; children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.rail}>
        <Link className={styles.brand} href="/jobs">
          <RegistrationMark />
          <span>Proofline</span>
        </Link>
        <p className={styles.shop}>
          <span className={styles.shopName}>Copperline Signs &amp; Print</span>
          <span>{live || !today ? 'Live shop' : `Demo shop · snapshot ${formatLongDate(today)}`}</span>
        </p>
        <RoleSwitcher />
        <NavLinks />
        <div className={styles.foot}>
          <ResetDemo />
          <p className={styles.credit}>
            A portfolio concept by{' '}
            <a href="https://www.mll-creativeeng.com" rel="noopener noreferrer">Michael L. Lawson</a>. Shop, customers and jobs are
            fictional.{!live && ' Changes you make stay in this browser tab.'}
          </p>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
