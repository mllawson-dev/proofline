'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { formatShortDate, formatSize } from '@/lib/jobs';
import { formatLongDate } from '@/lib/format';
import type { Customer, Job } from '@/lib/types';
import { openProof } from '@/lib/workflow';
import { ProofSheet } from './ProofSheet';
import styles from './CustomerProof.module.css';

export type Result = { outcome: 'approved' } | { outcome: 'changes-requested'; note: string };

export type CustomerProofProps = {
  job: Job;
  customer?: Customer;
  designerName?: string;
  /** Saves the customer's answer; throws with a readable message if it cannot. */
  answer: (r: Result) => Promise<void>;
  /** Demo only: put the proof back so the visitor can try the other answer. */
  undo?: () => Promise<void>;
  demo: boolean;
};

/** What a customer sees when they open the proof link from a text or email. Phone first. */
export function CustomerProof({ job, customer, designerName, answer, undo, demo }: CustomerProofProps) {
  const [mode, setMode] = useState<'review' | 'changes'>('review');
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result>();
  const errorId = useId();
  const resultRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [focusTarget, setFocusTarget] = useState<'note' | 'result'>();

  // Move focus once React has drawn the new state, so screen readers land on what changed.
  useEffect(() => {
    if (focusTarget === 'note') noteRef.current?.focus();
    if (focusTarget === 'result') resultRef.current?.focus();
    setFocusTarget(undefined);
  }, [focusTarget]);

  const proof = openProof(job);
  const designer = designerName ?? 'our design team';
  const firstName = customer?.contact.replace(/^Coach /, '').split(' ')[0] ?? 'there';
  const earlier = job.proofs.filter((p) => p.outcome === 'changes-requested');

  async function finish(r: Result) {
    try {
      await answer(r);
      setResult(r);
      setError(undefined);
      setFocusTarget('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className={styles.screen}>
      {demo && (
        <p className={styles.demo}>
          <span>Demo: the customer’s view of a proof link.</span>
          <Link href="/proofs">Back to the shop</Link>
        </p>
      )}

      <header className={styles.brandBar}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 1.5v21M1.5 12h21" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span>Copperline Signs &amp; Print</span>
      </header>

      <main id="main" className={styles.body} tabIndex={-1}>
        {result ? (
          <div ref={resultRef} tabIndex={-1} className={styles.result} data-outcome={result.outcome} role="status">
            {result.outcome === 'approved' ? (
              <>
                <h1>Thanks, {firstName}. It’s approved.</h1>
                <p>
                  {job.id} goes to the print floor now. We’ll text you when it’s ready, on or before {formatLongDate(job.dueOn)}.
                </p>
              </>
            ) : (
              <>
                <h1>Got it. {designer.split(' ')[0]} will send a new proof.</h1>
                <p>Your note: “{result.note}”</p>
                <p>You’ll get a link to proof v{job.proofs.length + 1} as soon as it’s ready.</p>
              </>
            )}
            {demo && (
              <div className={styles.resultActions}>
                {undo && (
                  <button
                    type="button"
                    onClick={async () => {
                      await undo();
                      setResult(undefined);
                      setMode('review');
                    }}
                  >
                    Undo (demo)
                  </button>
                )}
                <Link href="/proofs">Back to the shop</Link>
              </div>
            )}
          </div>
        ) : !proof ? (
          <div className={styles.result}>
            <h1>This proof has already been answered</h1>
            <p>
              {job.id} is past the proof stage, so there’s nothing to approve here. If something still looks wrong, call the shop at
              (480) 555-0142.
            </p>
            {demo && (
              <div className={styles.resultActions}>
                <Link href="/proofs">Back to the shop</Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.intro}>
              <p className="label">
                Proof v{proof.version} · sent {formatShortDate(proof.sentOn)}
              </p>
              <h1>{job.title}</h1>
              <p>
                Hi {firstName}, here’s the layout for your {job.product.toLowerCase()}. Please check it and let {designer.split(' ')[0]} know
                if it’s ready to print.
              </p>
            </div>

            <div className={styles.sheet}>
              <ProofSheet job={job} customer={customer?.name ?? ''} />
            </div>

            <dl className={styles.specs}>
              <div><dt>Job</dt><dd className="mono">{job.id}</dd></div>
              <div><dt>Finished size</dt><dd>{formatSize(job)}</dd></div>
              <div><dt>Quantity</dt><dd>{job.quantity}</dd></div>
              <div><dt>Material</dt><dd>{job.material}</dd></div>
              <div><dt>Needed by</dt><dd>{formatLongDate(job.dueOn)}</dd></div>
            </dl>

            {earlier.length > 0 && (
              <details className={styles.history}>
                <summary>
                  Earlier rounds ({earlier.length})
                </summary>
                <ul>
                  {earlier.map((p) => (
                    <li key={p.version}>
                      v{p.version}, {formatShortDate(p.sentOn)}: changes requested{p.note ? ` — “${p.note}”` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {mode === 'review' ? (
              <form
                className={styles.decide}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!checked) {
                    setError('Please tick the box to confirm you’ve checked the proof.');
                    return;
                  }
                  finish({ outcome: 'approved' });
                }}
                noValidate
              >
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setChecked(e.target.checked);
                      if (e.target.checked) setError(undefined);
                    }}
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={Boolean(error) || undefined}
                  />
                  <span>I’ve checked the spelling, phone numbers, size and colors. Print it as shown.</span>
                </label>
                {error && (
                  <p id={errorId} className={styles.error}>
                    {error}
                  </p>
                )}
                <button type="submit" className={styles.primary}>
                  Approve proof
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setMode('changes');
                    setError(undefined);
                    setFocusTarget('note');
                  }}
                >
                  Request changes
                </button>
              </form>
            ) : (
              <form
                className={styles.decide}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!note.trim()) {
                    setError('Tell us what to change so the designer can fix it.');
                    noteRef.current?.focus();
                    return;
                  }
                  finish({ outcome: 'changes-requested', note });
                }}
                noValidate
              >
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>What should we change?</span>
                  <span className={styles.hint} id={`${errorId}-hint`}>
                    Be specific: “Phone number is 480-555-0199”, “Make the logo bigger”.
                  </span>
                  <textarea
                    ref={noteRef}
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    aria-describedby={`${errorId}-hint${error ? ` ${errorId}` : ''}`}
                    aria-invalid={Boolean(error) || undefined}
                    required
                  />
                </label>
                {error && (
                  <p id={errorId} className={styles.error}>
                    {error}
                  </p>
                )}
                <button type="submit" className={styles.primary}>
                  Send changes to {designer.split(' ')[0]}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setMode('review');
                    setError(undefined);
                  }}
                >
                  Back to the proof
                </button>
              </form>
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        Questions? Call the shop at (480) 555-0142.{demo && ' Proofline is a portfolio concept by Michael L. Lawson; the shop and customers are fictional.'}
      </footer>
    </div>
  );
}
