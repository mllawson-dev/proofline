'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useShop } from '@/lib/shop';
import { daysBetween, dueLabel, dueState, formatShortDate } from '@/lib/jobs';
import { openProof } from '@/lib/workflow';
import { CopyProofLink } from './CopyProofLink';
import styles from './ProofQueue.module.css';

/** Staff view of every proof out with a customer, longest wait first. */
export function ProofQueue() {
  const { jobs, today, customers, customerName, staffName, mode } = useShop();
  const contact = useMemo(() => new Map(customers.map((c) => [c.id, c.contact])), [customers]);

  const waiting = useMemo(
    () =>
      jobs
        .flatMap((job) => {
          const proof = openProof(job);
          return proof ? [{ job, proof, days: daysBetween(proof.sentOn, today) }] : [];
        })
        .sort((a, b) => b.days - a.days || a.job.id.localeCompare(b.job.id)),
    [jobs, today]
  );

  const answered = useMemo(
    () => jobs.filter((j) => j.proofs.some((p) => p.note)).map((job) => ({ job, round: job.proofs.findLast((p) => p.note)! })),
    [jobs]
  );

  return (
    <section aria-labelledby="proofs-heading" className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className="label">Copperline Signs &amp; Print</p>
          <h1 id="proofs-heading">Proofs with customers</h1>
        </div>
        <p className={styles.intro}>
          {mode === 'live'
            ? 'Each customer gets a signed link by text or email. It works for that proof only and expires after 14 days.'
            : 'Each customer gets a link by text or email. Open one to see the approval screen they use on their phone.'}
        </p>
      </header>

      {waiting.length === 0 ? (
        <div className={styles.empty}>
          <h2>No proofs out</h2>
          <p>
            Every proof has an answer. Send the next one from the <Link href="/board">production board</Link>.
          </p>
        </div>
      ) : (
        <ol className={styles.list}>
          {waiting.map(({ job, proof, days }) => (
            <li key={job.id} className={styles.item} data-slow={days >= 3 || undefined}>
              <div className={styles.main}>
                <p className={styles.top}>
                  <span className="mono">{job.id}</span>
                  <span>proof v{proof.version}</span>
                  {job.rush && <span className={styles.rush}>Rush</span>}
                </p>
                <h2 className={styles.title}>{job.title}</h2>
                <p className={styles.sub}>
                  {customerName(job.customerId)} · {contact.get(job.customerId)}
                  {job.designerId && <> · designed by {staffName(job.designerId)}</>}
                </p>
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>Sent</dt>
                  <dd>
                    {formatShortDate(proof.sentOn)}
                    <span className={styles.wait} data-slow={days >= 3 || undefined}>
                      {days === 0 ? ' · today' : ` · ${days} ${days === 1 ? 'day' : 'days'} ago`}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Job due</dt>
                  <dd className={styles.due} data-state={dueState(job, today)}>
                    {dueLabel(job, today)}
                  </dd>
                </div>
              </dl>
              {mode === 'live' ? (
                <CopyProofLink jobId={job.id} />
              ) : (
                <Link className={styles.open} href={`/p/${job.id}`}>
                  Customer view<span className="visually-hidden"> of the {job.id} proof</span>
                  <span aria-hidden="true"> →</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}

      {answered.length > 0 && (
        <section aria-labelledby="notes-heading" className={styles.notes}>
          <h2 id="notes-heading">Change requests from customers</h2>
          <ul>
            {answered.map(({ job, round }) => (
              <li key={job.id}>
                <span className="mono">{job.id}</span> v{round.version}: “{round.note}”
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
