'use client';

import { useEffect, useState } from 'react';
import { useShop } from '@/lib/shop';
import type { Customer, Job } from '@/lib/types';
import { CustomerProof, type Result } from './CustomerProof';
import styles from './CustomerProof.module.css';

/** Demo: the proof comes from the visitor's demo store. */
export function DemoCustomerProof({ id }: { id: string }) {
  const { getJob, customers, staffName, answer, undo } = useShop();
  const job = getJob(id);
  if (!job) return null; // the route only renders known job numbers
  return (
    <CustomerProof
      job={job}
      customer={customers.find((c) => c.id === job.customerId)}
      designerName={staffName(job.designerId)}
      answer={async (r: Result) => {
        await answer(id, r);
      }}
      undo={undo}
      demo
    />
  );
}

type Loaded = { job: Job; customer: Customer; designerName?: string };

/** Live: the signed link is the customer's only credential; the server checks it and talks to Firestore. */
export function LiveCustomerProof({ id }: { id: string }) {
  const [data, setData] = useState<Loaded>();
  const [problem, setProblem] = useState<string>();
  const [token, setToken] = useState<string>();

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('t') ?? '');
  }, []);

  useEffect(() => {
    if (token === undefined) return;
    if (!token) {
      setProblem('This link is incomplete. Use the full link from your text or email.');
      return;
    }
    const controller = new AbortController();
    fetch(`/api/proofs/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json()) as Loaded & { error?: string };
        if (!res.ok) throw new Error(body.error ?? 'This proof could not be loaded.');
        setData(body);
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setProblem(e.message);
      });
    return () => controller.abort();
  }, [id, token]);

  if (problem) {
    return (
      <main id="main" className={styles.screen}>
        <div className={styles.body}>
          <div className={styles.result} data-outcome="changes-requested">
            <h1>We couldn’t open this proof</h1>
            <p>{problem}</p>
            <p>Call the shop at (480) 555-0142 and we’ll send a new link.</p>
          </div>
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main id="main" className={styles.screen}>
        <p className={styles.body} role="status">
          Loading your proof…
        </p>
      </main>
    );
  }
  return (
    <CustomerProof
      job={data.job}
      customer={data.customer}
      designerName={data.designerName}
      answer={async (r: Result) => {
        const res = await fetch(`/api/proofs/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: token ?? '', answer: r })
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Your answer did not save. Please try again.');
      }}
      demo={false}
    />
  );
}
