import { describe, expect, it } from 'vitest';
import { canSee, checkRoleMove, myWork, ROLE_STAGES, roleMoves } from '@/lib/roles';
import { addDays, generateJobs, SNAPSHOT_DATE, staff } from '@/lib/seed';
import { STAGES, type Job, type Role, type Stage } from '@/lib/types';
import { checkMove } from '@/lib/workflow';

const today = SNAPSHOT_DATE;
const job = (stage: Stage): Job => ({
  id: 'PL-1', title: 'Test', customerId: 'c01', product: 'Banner', size: { w: 72, h: 36 }, quantity: 1, material: 'vinyl',
  stage, rush: false, createdOn: addDays(today, -5), dueOn: today, designerId: 's02',
  proofs: stage === 'awaiting-approval' ? [{ version: 1, sentOn: today, comments: 0 }] : [{ version: 1, sentOn: today, outcome: 'approved', comments: 0 }]
});

/** Every one-step move the shop rules allow, from every stage. */
const shopMoves: [Stage, Stage][] = STAGES.flatMap((from) =>
  STAGES.filter((to) => checkMove(job(from), to).ok).map((to) => [from, to] as [Stage, Stage])
);

describe('role moves', () => {
  it('lets the manager make every move the shop rules allow', () => {
    for (const [from, to] of shopMoves) expect(checkRoleMove('manager', job(from), to).ok).toBe(true);
  });
  it('gives every shop move to exactly one staff role besides the manager', () => {
    for (const [from, to] of shopMoves) {
      const owners = (['counter', 'designer', 'production'] as const).filter((r) => checkRoleMove(r, job(from), to).ok);
      expect(owners, `${from} → ${to}`).toHaveLength(1);
    }
  });
  it('never lets a role break a shop rule', () => {
    for (const role of ['counter', 'designer', 'production'] as const) {
      for (const [from, to] of roleMoves(role)) expect(checkMove(job(from), to).ok, `${role}: ${from} → ${to}`).toBe(true);
    }
  });
  it('explains who owns a move a role cannot make', () => {
    const r = checkRoleMove('designer', job('printing'), 'finishing');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/production/);
  });
  it('keeps each role’s moves inside or next to its own stages', () => {
    for (const role of ['counter', 'designer', 'production'] as const) {
      for (const [from] of roleMoves(role)) expect(ROLE_STAGES[role]).toContain(from);
    }
  });
});

describe('screens', () => {
  it('shows the dashboard to the manager only', () => {
    const roles: Role[] = ['counter', 'designer', 'production', 'manager'];
    expect(roles.filter((r) => canSee(r, 'dashboard'))).toEqual(['manager']);
  });
  it('gives every role the jobs list and the board', () => {
    for (const r of ['counter', 'designer', 'production', 'manager'] as const) {
      expect(canSee(r, 'jobs') && canSee(r, 'board')).toBe(true);
    }
  });
});

describe('my work', () => {
  const jobs = generateJobs();
  it('shows a designer only their own open jobs', () => {
    const jordan = staff.find((s) => s.name === 'Jordan Kim')!;
    const mine = jobs.filter(myWork('designer', jordan)!.test);
    expect(mine.length).toBeGreaterThan(0);
    for (const j of mine) expect(j.designerId).toBe(jordan.id);
  });
  it('gives the manager no narrower starting view', () => {
    expect(myWork('manager', staff.find((s) => s.role === 'manager')!)).toBeUndefined();
  });
});
