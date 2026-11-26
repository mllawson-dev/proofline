import { describe, expect, it } from 'vitest';
import { designerLoad, headline, needsAttention, proofStats, stageLoad } from '@/lib/dashboard';
import { isLate, isOpen } from '@/lib/jobs';
import { addDays, generateJobs, SNAPSHOT_DATE, staff } from '@/lib/seed';
import type { Job } from '@/lib/types';

const today = SNAPSHOT_DATE;
const jobs = generateJobs();
const base: Job = {
  id: 'PL-1', title: 'Test', customerId: 'c01', product: 'Banner', size: { w: 72, h: 36 }, quantity: 1,
  material: 'vinyl', stage: 'printing', rush: false, createdOn: addDays(today, -5), dueOn: addDays(today, 5), proofs: []
};

describe('stage load', () => {
  it('accounts for every job that has not been picked up', () => {
    const total = stageLoad(jobs, today).reduce((n, s) => n + s.count, 0);
    expect(total).toBe(jobs.filter((j) => j.stage !== 'picked-up').length);
  });
  it('counts late jobs inside their stage', () => {
    const late = stageLoad(jobs, today).reduce((n, s) => n + s.late, 0);
    expect(late).toBe(jobs.filter((j) => isLate(j, today)).length);
  });
});

describe('headline', () => {
  it('matches the open and late counts used elsewhere', () => {
    const h = headline(jobs, today);
    expect(h.open).toBe(jobs.filter(isOpen).length);
    expect(h.late).toBe(jobs.filter((j) => isLate(j, today)).length);
  });
  it('averages the age of unanswered proofs', () => {
    const waiting = [
      { ...base, id: 'A', stage: 'awaiting-approval' as const, proofs: [{ version: 1, sentOn: addDays(today, -2), comments: 0 }] },
      { ...base, id: 'B', stage: 'awaiting-approval' as const, proofs: [{ version: 1, sentOn: addDays(today, -5), comments: 0 }] }
    ];
    expect(headline(waiting, today)).toMatchObject({ waiting: 2, avgWaitDays: 3.5 });
  });
  it('reports no wait time when no proofs are out', () => {
    expect(headline([base], today).avgWaitDays).toBeNull();
  });
  it('never reports a negative wait for the seeded shop', () => {
    expect(headline(jobs, today).avgWaitDays ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe('proof stats', () => {
  it('measures first-round approvals among approved jobs', () => {
    const one = { ...base, id: 'A', proofs: [{ version: 1, sentOn: today, outcome: 'approved' as const, comments: 0 }] };
    const three = {
      ...base,
      id: 'B',
      proofs: [
        { version: 1, sentOn: today, outcome: 'changes-requested' as const, comments: 2 },
        { version: 2, sentOn: today, outcome: 'changes-requested' as const, comments: 1 },
        { version: 3, sentOn: today, outcome: 'approved' as const, comments: 0 }
      ]
    };
    const s = proofStats([one, three]);
    expect(s.firstRoundRate).toBe(0.5);
    expect(s.avgRounds).toBe(2);
    expect(s.manyRounds.map((j) => j.id)).toEqual(['B']);
  });
});

describe('needs attention', () => {
  const list = needsAttention(jobs, today);
  it('lists every late job, most late first', () => {
    const late = list.filter((a) => a.reason === 'late');
    expect(late).toHaveLength(jobs.filter((j) => isLate(j, today)).length);
    for (let i = 1; i < late.length; i++) expect(late[i - 1]!.days).toBeGreaterThanOrEqual(late[i]!.days);
  });
  it('puts late work above everything else', () => {
    const firstOther = list.findIndex((a) => a.reason !== 'late');
    if (firstOther > -1) expect(list.slice(firstOther).some((a) => a.reason === 'late')).toBe(false);
  });
  it('lists each job once and never a finished one', () => {
    expect(new Set(list.map((a) => a.job.id)).size).toBe(list.length);
    for (const a of list) expect(isOpen(a.job)).toBe(true);
  });
  it('flags a proof the customer has had for three days', () => {
    const slow = { ...base, stage: 'awaiting-approval' as const, proofs: [{ version: 1, sentOn: addDays(today, -3), comments: 0 }] };
    expect(needsAttention([slow], today)).toEqual([{ job: slow, reason: 'proof-waiting', days: 3 }]);
  });
});

describe('designer load', () => {
  it('splits each designer’s open jobs by owner and covers only designers', () => {
    const loads = designerLoad(jobs, staff);
    expect(loads.map((l) => l.designer.role)).toEqual(loads.map(() => 'designer'));
    const counted = loads.reduce((n, l) => n + l.onDesk + l.withCustomer + l.inProduction, 0);
    expect(counted).toBe(jobs.filter((j) => j.designerId && isOpen(j) && j.stage !== 'intake').length);
  });
});
