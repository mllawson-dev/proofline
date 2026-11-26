'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { useId, useState } from 'react';
import { firebase } from '@/lib/firebase/client';
import styles from './SignIn.module.css';

/** Staff sign-in for live mode. Accounts are created by the shop manager; there is no public sign-up. */
export function SignIn({ error }: { error?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>(error);
  const errorId = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setMessage('Enter your work email and password.');
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      await signInWithEmailAndPassword(firebase().auth, email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setMessage(
        code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'That email and password don’t match a shop account.'
          : code.includes('too-many-requests')
            ? 'Too many tries. Wait a minute, then try again.'
            : 'Sign-in failed. Check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className={styles.page}>
      <form className={styles.card} onSubmit={submit} noValidate aria-describedby={message ? errorId : undefined}>
        <p className={styles.brand}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 1.5v21M1.5 12h21" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Proofline
        </p>
        <h1>Sign in to the shop</h1>
        <label className={styles.field}>
          <span>Work email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {message && (
          <p id={errorId} className={styles.error} role="alert">
            {message}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className={styles.note}>Accounts are set up by the shop manager.</p>
      </form>
    </main>
  );
}
