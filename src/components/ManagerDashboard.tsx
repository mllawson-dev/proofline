'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useShop } from '@/lib/shop';
import { designerLoad, headline, needsAttention, proofStats, stageLoad, type Attention } from '@/lib/dashboard';
import { formatLongDate } from '@/lib/format';
import { STAGE_OWNER } from '@/lib/types';
import { OWNER_LABEL, StageChip } from './StageChip';
import styles from './ManagerDashboard.module.css';

const REASON: Record<Attention['reason'], (days: number) => string> = {
  late: (d) => `${d} ${d === 1 ? 'day' : 'days'} late`,
  'due-today': () => 'Due today',
  'rush-soon': (d) => (d === 1 ? 'Rush, due tomorrow' : `Rush, due in ${d} days`),
  'proof-waiting': (d) => `Proof unanswered ${d} days`
};

export function ManagerDashboard() {
  const { jobs, staff, today, customerName, mode } = useShop();
  const h = useMemo(() => headline(jobs, today), [jobs, today]);
  const load = useMemo(() => stageLoad(jobs, today), [jobs, today]);
  const proofs = useMemo(() => proofStats(jobs), [jobs]);
  const attention = useMemo(() => needsAttention(jobs, today), [jobs, today]);
  const designers = useMemo(() => designerLoad(jobs, staff), [jobs, staff]);
  const maxStage = Math.max(1, ...load.map((l) => l.count));

  return (
    <section aria-labelledby="dash-heading" className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className="label">Copperline Signs &amp; Print</p>
          <h1 id="dash-heading">Shop week</h1>
        </div>
        <p className={styles.asOf}>As of {formatLongDate(today)}</p>
      </header>

      <dl className={styles.tiles}>
        <div className={styles.tile}>
          <dt>Open jobs</dt>
          <dd className={styles.figure}>{h.open}</dd>
          <dd className={styles.note}>{h.rushOpen} marked rush</dd>
        </div>
        <div className={styles.tile} data-tone={h.late > 0 ? 'late' : undefined}>
          <dt>Late</dt>
          <dd className={styles.figure}>{h.late}</dd>
          <dd className={styles.note}>{h.late === 0 ? 'Nothing past due' : `${Math.round((h.late / Math.max(1, h.open)) * 100)}% of open work`}</dd>
        </div>
        <div className={styles.tile}>
          <dt>Due in 3 days</dt>
          <dd className={styles.figure}>{h.dueSoon}</dd>
          <dd className={styles.note}>Including today</dd>
        </div>
        <div className={styles.tile}>
          <dt>Waiting on customers</dt>
          <dd className={styles.figure}>{h.waiting}</dd>
          <dd className={styles.note}>{h.avgWaitDays === null ? 'No proofs out' : `Proofs out ${h.avgWaitDays} days on average`}</dd>
        </div>
        <div className={styles.tile}>
          <dt>First-proof approvals</dt>
          <dd className={styles.figure}>{proofs.firstRoundRate === null ? '—' : `${Math.round(proofs.firstRoundRate * 100)}%`}</dd>
          <dd className={styles.note}>
            {proofs.avgRounds === null ? 'No approvals yet' : `${proofs.avgRounds} rounds on average, ${proofs.approvedJobs} jobs`}
          </dd>
        </div>
      </dl>

      <div className={styles.grid}>
        <div className={styles.col}>
        <section className={styles.panel} aria-labelledby="where-heading">
          <div className={styles.panelHead}>
            <h2 id="where-heading">Where the work is</h2>
            <Link href="/board">Open the board</Link>
          </div>
          <table className={styles.load}>
            <caption className="visually-hidden">Jobs in each stage, left to right through the shop, and how many are late</caption>
            <thead>
              <tr>
                <th scope="col">Stage</th>
                <th scope="col" className={styles.num}>Jobs</th>
                <th scope="col" className={styles.barCol}><span className="visually-hidden">Share of jobs</span></th>
                <th scope="col" className={styles.num}>Late</th>
              </tr>
            </thead>
            <tbody>
              {load.map((row) => (
                <tr key={row.stage}>
                  <th scope="row">
                    <StageChip stage={row.stage} />
                  </th>
                  <td className={styles.num}>{row.count}</td>
                  <td className={styles.barCol} aria-hidden="true">
                    <span className={styles.bar} style={{ inlineSize: `${(row.count / maxStage) * 100}%` }} />
                  </td>
                  <td className={styles.num} data-late={row.late > 0 || undefined}>
                    {row.late === 0 ? <span className={styles.zero}>0</span> : row.late}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.foot}>
            Chips show who owns the next move. The longest bar is the bottleneck to talk about at the morning huddle.
          </p>
        </section>

        <section className={styles.panel} aria-labelledby="design-heading">
          <div className={styles.panelHead}>
            <h2 id="design-heading">Designer load</h2>
          </div>
          <table className={styles.people}>
            <caption className="visually-hidden">Open jobs per designer, by where each job is</caption>
            <thead>
              <tr>
                <th scope="col">Designer</th>
                <th scope="col" className={styles.num}>Designing</th>
                <th scope="col" className={styles.num}>With customer</th>
                <th scope="col" className={styles.num}>In production</th>
              </tr>
            </thead>
            <tbody>
              {designers.map((d) => (
                <tr key={d.designer.id}>
                  <th scope="row">{d.designer.name}</th>
                  <td className={styles.num}>{d.onDesk}</td>
                  <td className={styles.num}>{d.withCustomer}</td>
                  <td className={styles.num}>{d.inProduction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.panel} aria-labelledby="rounds-heading">
          <div className={styles.panelHead}>
            <h2 id="rounds-heading">Three or more proof rounds</h2>
            <span className={styles.count}>{proofs.manyRounds.length}</span>
          </div>
          {proofs.manyRounds.length === 0 ? (
            <p className={styles.emptyNote}>No open job has needed three rounds.</p>
          ) : (
            <ul className={styles.rounds}>
              {proofs.manyRounds.map((job) => (
                <li key={job.id}>
                  <span className="mono">{job.id}</span>
                  <span>
                    {job.title} · {customerName(job.customerId)}
                  </span>
                  <span className={styles.sub}>{job.proofs.length} rounds</span>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.foot}>Several rounds usually means the brief was unclear. Worth a call before the next proof goes out.</p>
        </section>
        </div>
        <div className={styles.col}>
        <section className={styles.panel} aria-labelledby="attention-heading">
          <div className={styles.panelHead}>
            <h2 id="attention-heading">Needs attention</h2>
            <span className={styles.count}>{attention.length}</span>
          </div>
          {attention.length === 0 ? (
            <p className={styles.emptyNote}>Nothing late, due today or waiting too long. A good day.</p>
          ) : (
            <ol className={styles.attention}>
              {attention.map(({ job, reason, days }) => (
                <li key={job.id} data-reason={reason}>
                  <div className={styles.attnMain}>
                    <span className="mono">{job.id}</span>
                    <span className={styles.attnTitle}>{job.title}</span>
                    <span className={styles.sub}>
                      {customerName(job.customerId)} · next move: {OWNER_LABEL[STAGE_OWNER[job.stage]]}
                    </span>
                  </div>
                  <div className={styles.attnSide}>
                    <span className={styles.reason}>{REASON[reason](days)}</span>
                    {reason === 'proof-waiting' ? (
                      <Link href={mode === 'live' ? '/proofs' : `/p/${job.id}`}>View proof<span className="visually-hidden"> for {job.id}</span></Link>
                    ) : (
                      <StageChip stage={job.stage} />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        </div>
      </div>
    </section>
  );
}
