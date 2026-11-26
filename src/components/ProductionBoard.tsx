'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop } from '@/lib/shop';
import { daysUntilDue, dueLabel, dueState, formatSize, isLate } from '@/lib/jobs';
import { STAGES, STAGE_LABELS, STAGE_OWNER, type Job, type Stage } from '@/lib/types';
import { checkRoleMove, ROLE_LABELS, ROLE_STAGES } from '@/lib/roles';
import { nextStage, previousStage } from '@/lib/workflow';
import { OWNER_LABEL } from './StageChip';
import styles from './ProductionBoard.module.css';

type Notice = { tone: 'done' | 'blocked'; text: string; undo?: boolean };

/** Late first, then soonest due, then rush, so the top card is always the one to pick up next. */
function byUrgency(today: string) {
  return (a: Job, b: Job) =>
    Number(isLate(b, today)) - Number(isLate(a, today)) ||
    daysUntilDue(a, today) - daysUntilDue(b, today) ||
    Number(b.rush) - Number(a.rush) ||
    a.id.localeCompare(b.id);
}

export function ProductionBoard() {
  const { jobs, today, customerName, move, undo, lastChange, role, mode } = useShop();
  const [notice, setNotice] = useState<Notice>();
  // Everyone but the manager opens on their own stages; the whole shop is one click away.
  const [showAll, setShowAll] = useState(role === 'manager');
  const [shownRole, setShownRole] = useState(role);
  if (shownRole !== role) {
    setShownRole(role);
    setShowAll(role === 'manager');
    setNotice(undefined);
  }
  const mine = ROLE_STAGES[role];
  const [dragging, setDragging] = useState<Job>();
  const [refocus, setRefocus] = useState<{ id: string; dir: 'back' | 'forward' }>();
  const cardButtons = useRef(new Map<string, HTMLElement>());
  const noticeRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => {
    const sort = byUrgency(today);
    return STAGES.filter((stage) => showAll || mine.includes(stage)).map((stage) => ({ stage, jobs: jobs.filter((j) => j.stage === stage).sort(sort) }));
  }, [jobs, today, showAll, mine]);

  // A keyboard move re-renders the card in another column; put focus back on the same control.
  useEffect(() => {
    if (!refocus) return;
    const { id, dir } = refocus;
    const refs = cardButtons.current;
    // Same control if it still exists, else the other move, else the proof link, else the card itself.
    const el = refs.get(`${id}:${dir}`) ?? refs.get(`${id}:${dir === 'back' ? 'forward' : 'back'}`) ?? refs.get(`${id}:proof`) ?? refs.get(`${id}:card`);
    // The card may have left this role's columns: then the message announcing the move takes focus.
    (el ?? noticeRef.current)?.focus();
    setRefocus(undefined);
  }, [refocus, jobs]);

  async function tryMove(job: Job, to: Stage | undefined, dir?: 'back' | 'forward') {
    if (!to) return;
    const check = checkRoleMove(role, job, to);
    if (!check.ok) {
      setNotice({ tone: 'blocked', text: check.reason });
      return;
    }
    try {
      await move(job.id, to);
    } catch (e) {
      setNotice({ tone: 'blocked', text: e instanceof Error ? e.message : 'That move did not save. Try again.' });
      return;
    }
    const sent = job.stage === 'proofing' && to === 'awaiting-approval';
    setNotice({
      tone: 'done',
      text: sent ? `${job.id} proof v${job.proofs.length + 1} sent to ${customerName(job.customerId)}.` : `${job.id} moved to ${STAGE_LABELS[to]}.`,
      undo: true
    });
    if (dir) setRefocus({ id: job.id, dir });
  }

  const open = jobs.filter((j) => j.stage !== 'ready' && j.stage !== 'picked-up').length;
  const late = jobs.filter((j) => isLate(j, today)).length;

  return (
    <section aria-labelledby="board-heading" className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className="label">Copperline Signs &amp; Print</p>
          <h1 id="board-heading">Production board</h1>
        </div>
        <p className={styles.summary}>
          <strong>{open}</strong> open · <strong className={styles.lateText}>{late}</strong> late. Use the arrow buttons on a card, or drag
          it to the next column. Cards only offer the moves a {ROLE_LABELS[role].toLowerCase()} can make.
        </p>
      </header>

      {role !== 'manager' && (
        <div className={styles.scope}>
          <p>
            {showAll ? 'Showing the whole shop.' : `Showing your stages as ${ROLE_LABELS[role].toLowerCase()}.`}
          </p>
          <button type="button" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)}>
            Show the whole shop
          </button>
        </div>
      )}

      <div className={styles.notice} role="status" aria-live="polite" data-tone={notice?.tone} ref={noticeRef} tabIndex={-1}>
        {notice && (
          <>
            <span>{notice.text}</span>
            {notice.undo && lastChange && (
              <button
                type="button"
                onClick={async () => {
                  await undo();
                  setNotice({ tone: 'done', text: `Undone. ${lastChange.before.id} is back in ${STAGE_LABELS[lastChange.before.stage]}.` });
                }}
              >
                Undo
              </button>
            )}
            <button type="button" className={styles.dismiss} onClick={() => setNotice(undefined)} aria-label="Dismiss message">
              ×
            </button>
          </>
        )}
      </div>

      <div className={styles.board} role="list" aria-label="Stages, left to right">
        {columns.map(({ stage, jobs: inStage }) => {
          const owner = STAGE_OWNER[stage];
          const dropState = dragging ? (checkRoleMove(role, dragging, stage).ok ? 'ok' : dragging.stage === stage ? undefined : 'no') : undefined;
          return (
            <section
              key={stage}
              role="listitem"
              className={styles.column}
              data-owner={owner}
              data-drop={dropState}
              aria-labelledby={`col-${stage}`}
              onDragOver={(e) => {
                if (dropState === 'ok') e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging) tryMove(dragging, stage);
                setDragging(undefined);
              }}
            >
              <header className={styles.colHead}>
                <h2 id={`col-${stage}`}>
                  {STAGE_LABELS[stage]} <span className={styles.count}>{inStage.length}</span>
                </h2>
                <p className={styles.owner}>Next move: {OWNER_LABEL[owner]}</p>
              </header>

              {inStage.length === 0 ? (
                <p className={styles.empty}>Nothing here right now.</p>
              ) : (
                <ol className={styles.cards}>
                  {inStage.map((job) => {
                    // Only offer moves the shop rules allow; a button that can never work is noise.
                    const prev = previousStage(job.stage);
                    const back = prev && checkRoleMove(role, job, prev).ok ? prev : undefined;
                    const next = nextStage(job.stage);
                    const fwd = next && checkRoleMove(role, job, next).ok ? next : undefined;
                    const state = dueState(job, today);
                    const waiting = job.stage === 'awaiting-approval';
                    return (
                      <li
                        key={job.id}
                        ref={(el) => {
                          if (el) cardButtons.current.set(`${job.id}:card`, el);
                          else cardButtons.current.delete(`${job.id}:card`);
                        }}
                        tabIndex={-1}
                        aria-label={`${job.id}, ${job.title}`}
                        className={styles.card}
                        data-late={state === 'late' || undefined}
                        draggable={Boolean(back || fwd)}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', job.id);
                          setDragging(job);
                        }}
                        onDragEnd={() => setDragging(undefined)}
                      >
                        <div className={styles.cardTop}>
                          <span className="mono">{job.id}</span>
                          {job.rush && <span className={styles.rush}>Rush</span>}
                        </div>
                        <h3 className={styles.title}>{job.title}</h3>
                        <p className={styles.sub}>{customerName(job.customerId)}</p>
                        <p className={styles.sub}>
                          {job.product} · {formatSize(job)} · qty {job.quantity}
                        </p>
                        <p className={styles.due} data-state={state}>
                          {dueLabel(job, today)}
                          {job.proofs.length > 0 && <span className={styles.rounds}> · proof v{job.proofs.length}</span>}
                        </p>
                        {!back && !fwd && !waiting && (
                          <p className={styles.handoff}>Next move: {OWNER_LABEL[STAGE_OWNER[job.stage]]}</p>
                        )}
                        <div className={styles.actions}>
                          {back && (
                            <button
                              type="button"
                              ref={(el) => {
                                if (el) cardButtons.current.set(`${job.id}:back`, el);
                                else cardButtons.current.delete(`${job.id}:back`);
                              }}
                              onClick={() => tryMove(job, back, 'back')}
                            >
                              <span aria-hidden="true">←</span>
                              <span className="visually-hidden">Move {job.id} back to </span>
                              <span className={styles.toLabel}>{STAGE_LABELS[back]}</span>
                            </button>
                          )}
                          {waiting ? (
                            <Link
                              className={styles.proofLink}
                              href={mode === 'live' ? '/proofs' : `/p/${job.id}`}
                              ref={(el) => {
                                if (el) cardButtons.current.set(`${job.id}:proof`, el);
                                else cardButtons.current.delete(`${job.id}:proof`);
                              }}
                            >
                              Open proof<span className="visually-hidden"> for {job.id}</span>
                            </Link>
                          ) : (
                            fwd && (
                              <button
                                type="button"
                                className={styles.forward}
                                ref={(el) => {
                                  if (el) cardButtons.current.set(`${job.id}:forward`, el);
                                  else cardButtons.current.delete(`${job.id}:forward`);
                                }}
                                onClick={() => tryMove(job, fwd, 'forward')}
                              >
                                <span className="visually-hidden">{job.stage === 'proofing' ? `Send ${job.id} proof to the customer: ` : `Move ${job.id} to `}</span>
                                <span className={styles.toLabel}>{job.stage === 'proofing' ? 'Send proof' : STAGE_LABELS[fwd]}</span>
                                <span aria-hidden="true">→</span>
                              </button>
                            )
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
