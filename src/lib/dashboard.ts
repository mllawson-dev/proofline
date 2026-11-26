// Manager dashboard figures. Pure functions over the job list, unit-tested in tests/dashboard.test.ts.
// Every figure is something a shop manager acts on; nothing here is a vanity metric.

import { daysBetween, daysUntilDue, isLate, isOpen } from './jobs';
import { STAGES, STAGE_OWNER, type Job, type Owner, type Stage, type Staff } from './types';
import { openProof } from './workflow';

export type StageLoad = { stage: Stage; owner: Owner; count: number; late: number };

/** Jobs in each open stage, left to right, with how many of them are already late. */
export function stageLoad(jobs: Job[], today: string): StageLoad[] {
  return STAGES.filter((s) => s !== 'picked-up').map((stage) => {
    const inStage = jobs.filter((j) => j.stage === stage);
    return { stage, owner: STAGE_OWNER[stage], count: inStage.length, late: inStage.filter((j) => isLate(j, today)).length };
  });
}

export type Headline = {
  open: number;
  late: number;
  dueSoon: number; // due today through the next 3 days, not yet late
  waiting: number;
  avgWaitDays: number | null; // average age of proofs the customer has not answered
  rushOpen: number;
};

export function headline(jobs: Job[], today: string): Headline {
  const open = jobs.filter(isOpen);
  const waits = jobs.flatMap((j) => {
    const p = openProof(j);
    return p ? [daysBetween(p.sentOn, today)] : [];
  });
  return {
    open: open.length,
    late: open.filter((j) => isLate(j, today)).length,
    dueSoon: open.filter((j) => {
      const d = daysUntilDue(j, today);
      return d >= 0 && d <= 3;
    }).length,
    waiting: waits.length,
    avgWaitDays: waits.length ? round1(waits.reduce((a, b) => a + b, 0) / waits.length) : null,
    rushOpen: open.filter((j) => j.rush).length
  };
}

export type ProofStats = {
  approvedJobs: number; // jobs whose latest proof is approved
  firstRoundRate: number | null; // share approved on the first proof, 0–1
  avgRounds: number | null; // rounds it took to reach approval
  manyRounds: Job[]; // three or more rounds: a sign the brief or the proof needs a conversation
};

export function proofStats(jobs: Job[]): ProofStats {
  const approved = jobs.filter((j) => j.proofs.at(-1)?.outcome === 'approved');
  const rounds = approved.map((j) => j.proofs.length);
  return {
    approvedJobs: approved.length,
    firstRoundRate: approved.length ? approved.filter((j) => j.proofs.length === 1).length / approved.length : null,
    avgRounds: rounds.length ? round1(rounds.reduce((a, b) => a + b, 0) / rounds.length) : null,
    manyRounds: jobs.filter((j) => isOpen(j) && j.proofs.length >= 3)
  };
}

export type Attention = { job: Job; reason: 'late' | 'due-today' | 'rush-soon' | 'proof-waiting'; days: number };

/**
 * The short list a manager walks the floor with: late work first (most late at the top), then jobs due
 * today, then rush jobs due within two days, then proofs a customer has sat on for three days or more.
 */
export function needsAttention(jobs: Job[], today: string): Attention[] {
  const list: Attention[] = [];
  for (const job of jobs.filter(isOpen)) {
    const d = daysUntilDue(job, today);
    const proof = openProof(job);
    if (d < 0) list.push({ job, reason: 'late', days: -d });
    else if (d === 0) list.push({ job, reason: 'due-today', days: 0 });
    else if (job.rush && d <= 2) list.push({ job, reason: 'rush-soon', days: d });
    else if (proof && daysBetween(proof.sentOn, today) >= 3) list.push({ job, reason: 'proof-waiting', days: daysBetween(proof.sentOn, today) });
  }
  const order = { late: 0, 'due-today': 1, 'rush-soon': 2, 'proof-waiting': 3 } as const;
  return list.sort((a, b) => order[a.reason] - order[b.reason] || (a.reason === 'rush-soon' ? a.days - b.days : b.days - a.days) || a.job.id.localeCompare(b.job.id));
}

export type DesignerLoad = { designer: Staff; onDesk: number; withCustomer: number; inProduction: number };

/** Open jobs per designer, split by where each one is, so a full desk is visible before it slows proofs. */
export function designerLoad(jobs: Job[], staff: Staff[]): DesignerLoad[] {
  return staff
    .filter((s) => s.role === 'designer')
    .map((designer) => {
      const mine = jobs.filter((j) => j.designerId === designer.id && isOpen(j));
      return {
        designer,
        onDesk: mine.filter((j) => STAGE_OWNER[j.stage] === 'design').length,
        withCustomer: mine.filter((j) => STAGE_OWNER[j.stage] === 'customer').length,
        inProduction: mine.filter((j) => STAGE_OWNER[j.stage] === 'production').length
      };
    });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
