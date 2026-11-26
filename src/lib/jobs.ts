// Derived job facts and the saved views. Pure functions, unit-tested in tests/jobs.test.ts.

import { STAGES, STAGE_OWNER, type Job, type Stage } from './types';

export const OPEN_STAGES: Stage[] = STAGES.filter((s) => s !== 'ready' && s !== 'picked-up');

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Days until due, relative to `today`. Negative = late. */
export function daysUntilDue(job: Job, today: string): number {
  return daysBetween(today, job.dueOn);
}

export function isOpen(job: Job): boolean {
  return OPEN_STAGES.includes(job.stage);
}

export function isLate(job: Job, today: string): boolean {
  return isOpen(job) && daysUntilDue(job, today) < 0;
}

export type DueState = 'late' | 'today' | 'soon' | 'later' | 'done';

export function dueState(job: Job, today: string): DueState {
  if (!isOpen(job)) return 'done';
  const d = daysUntilDue(job, today);
  if (d < 0) return 'late';
  if (d === 0) return 'today';
  if (d <= 3) return 'soon';
  return 'later';
}

export function dueLabel(job: Job, today: string): string {
  const d = daysUntilDue(job, today);
  if (!isOpen(job)) return formatShortDate(job.dueOn);
  if (d < 0) return `${-d} ${-d === 1 ? 'day' : 'days'} late`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Tomorrow';
  return `In ${d} days`;
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatSize(job: Job): string {
  // Shops quote in one unit per job: feet when both sides are whole feet, otherwise inches.
  const { w, h } = job.size;
  return w % 12 === 0 && h % 12 === 0 ? `${w / 12}′ × ${h / 12}′` : `${w}″ × ${h}″`;
}

/** Proof rounds so far; the number managers watch most closely. */
export function proofRounds(job: Job): number {
  return job.proofs.length;
}

export type ViewId = 'open' | 'late' | 'waiting' | 'this-week' | 'rush' | 'all';

export const VIEWS: { id: ViewId; label: string; description: string; test: (job: Job, today: string) => boolean }[] = [
  { id: 'open', label: 'Open jobs', description: 'Everything not yet ready for pickup', test: (j) => isOpen(j) },
  { id: 'late', label: 'Late', description: 'Open jobs past their due date', test: (j, t) => isLate(j, t) },
  { id: 'waiting', label: 'Waiting on customer', description: 'Proofs sent, no answer yet', test: (j) => STAGE_OWNER[j.stage] === 'customer' },
  { id: 'this-week', label: 'Due in 7 days', description: 'Open jobs due within a week', test: (j, t) => isOpen(j) && daysUntilDue(j, t) >= 0 && daysUntilDue(j, t) <= 7 },
  { id: 'rush', label: 'Rush', description: 'Rush orders still open', test: (j) => j.rush && isOpen(j) },
  { id: 'all', label: 'All jobs', description: 'Including ready and picked up', test: () => true }
];

export function applyView(jobs: Job[], view: ViewId, today: string): Job[] {
  const def = VIEWS.find((v) => v.id === view) ?? VIEWS[0]!;
  return jobs.filter((j) => def.test(j, today));
}
