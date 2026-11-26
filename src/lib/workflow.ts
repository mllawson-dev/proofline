// Shop workflow rules: which moves are allowed on the production board and what a customer's
// proof answer does to a job. Pure functions, unit-tested in tests/workflow.test.ts.

import { STAGES, STAGE_LABELS, type Job, type ProofRound, type Stage } from './types';

export type MoveCheck = { ok: true } | { ok: false; reason: string };

/** Jobs move one stage at a time, like a ticket passed down the line. */
export function checkMove(job: Job, to: Stage): MoveCheck {
  const from = STAGES.indexOf(job.stage);
  const target = STAGES.indexOf(to);
  if (from === target) return { ok: false, reason: `Already in ${STAGE_LABELS[to]}.` };
  if (Math.abs(target - from) !== 1) {
    return { ok: false, reason: `Jobs move one stage at a time. ${job.id} can go to ${neighbourLabels(job.stage)}.` };
  }
  if (job.stage === 'awaiting-approval') {
    return { ok: false, reason: 'Waiting on the customer. The job moves when they approve the proof or ask for changes.' };
  }
  if (job.stage === 'printing' && to === 'awaiting-approval') {
    return { ok: false, reason: 'The proof is already approved. Reopen it from Proofing if the customer changes their mind.' };
  }
  return { ok: true };
}

function neighbourLabels(stage: Stage): string {
  const i = STAGES.indexOf(stage);
  return [STAGES[i - 1], STAGES[i + 1]]
    .filter((s): s is Stage => Boolean(s))
    .map((s) => STAGE_LABELS[s])
    .join(' or ');
}

export function previousStage(stage: Stage): Stage | undefined {
  return STAGES[STAGES.indexOf(stage) - 1];
}

export function nextStage(stage: Stage): Stage | undefined {
  return STAGES[STAGES.indexOf(stage) + 1];
}

/** Apply a board move. Sending a job from Proofing to the customer starts a new proof round. */
export function moveJob(job: Job, to: Stage, today: string): Job {
  const check = checkMove(job, to);
  if (!check.ok) throw new Error(check.reason);
  if (job.stage === 'proofing' && to === 'awaiting-approval') {
    const round: ProofRound = { version: job.proofs.length + 1, sentOn: today, comments: 0 };
    return { ...job, stage: to, proofs: [...job.proofs, round] };
  }
  return { ...job, stage: to };
}

export type ProofAnswer = { outcome: 'approved' } | { outcome: 'changes-requested'; note: string };

/** The latest proof round, if the customer still has to answer it. */
export function openProof(job: Job): ProofRound | undefined {
  const last = job.proofs.at(-1);
  return job.stage === 'awaiting-approval' && last && !last.outcome ? last : undefined;
}

/** A customer's answer: approval sends the job to Printing, changes send it back to Proofing. */
export function answerProof(job: Job, answer: ProofAnswer): Job {
  const round = openProof(job);
  if (!round) throw new Error(`${job.id} has no proof waiting for an answer.`);
  if (answer.outcome === 'changes-requested' && !answer.note.trim()) {
    throw new Error('Tell the designer what to change.');
  }
  const answered: ProofRound =
    answer.outcome === 'approved'
      ? { ...round, outcome: 'approved' }
      : { ...round, outcome: 'changes-requested', comments: round.comments + 1, note: answer.note.trim() };
  return {
    ...job,
    stage: answer.outcome === 'approved' ? 'printing' : 'proofing',
    proofs: [...job.proofs.slice(0, -1), answered]
  };
}
