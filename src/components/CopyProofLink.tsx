'use client';

import { useState } from 'react';
import styles from './ProofQueue.module.css';

/** Live mode: ask the server for a signed link to this job's open proof, then copy it to send by text or email. */
export function CopyProofLink({ jobId }: { jobId: string }) {
  const [state, setState] = useState<{ tone: 'idle' | 'busy' | 'done' | 'error'; text?: string; url?: string }>({ tone: 'idle' });

  async function copy() {
    setState({ tone: 'busy' });
    try {
      const { firebase } = await import('@/lib/firebase/client');
      const user = firebase().auth.currentUser;
      if (!user) throw new Error('Sign in again to get a proof link.');
      const res = await fetch('/api/proof-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ jobId })
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Could not make a link.');
      try {
        await navigator.clipboard.writeText(body.url);
        setState({ tone: 'done', text: 'Link copied. Paste it into a text or email.', url: body.url });
      } catch {
        // Clipboard can be blocked; show the link so it can be copied by hand.
        setState({ tone: 'done', text: 'Copy this link:', url: body.url });
      }
    } catch (e) {
      setState({ tone: 'error', text: e instanceof Error ? e.message : 'Could not make a link.' });
    }
  }

  return (
    <div className={styles.linkBox}>
      <button type="button" className={styles.open} onClick={copy} disabled={state.tone === 'busy'}>
        {state.tone === 'busy' ? 'Making link…' : 'Copy customer link'}
        <span className="visually-hidden"> for {jobId}</span>
      </button>
      <p role="status" aria-live="polite" className={styles.linkNote} data-tone={state.tone}>
        {state.text}
        {state.url && (
          <>
            {' '}
            <input readOnly value={state.url} aria-label={`Proof link for ${jobId}`} onFocus={(e) => e.currentTarget.select()} />
          </>
        )}
      </p>
    </div>
  );
}
