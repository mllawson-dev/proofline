import { describe, expect, it } from 'vitest';
import { applyView, dueLabel, dueState, formatSize, isLate, VIEWS } from '@/lib/jobs';
import { addDays, generateJobs, SNAPSHOT_DATE } from '@/lib/seed';
import { STAGES } from '@/lib/types';
import type { Job } from '@/lib/types';

const today = SNAPSHOT_DATE;
const base: Job = {
  id: 'PL-1', title: 'Test', customerId: 'c01', product: 'Banner', size: { w: 72, h: 36 }, quantity: 1,
  material: 'vinyl', stage: 'printing', rush: false, createdOn: addDays(today, -5), dueOn: today, proofs: []
};

describe('seed data', () => {
  it('is deterministic for a given seed', () => {
    expect(generateJobs(7)).toEqual(generateJobs(7));
  });
  it('covers every stage', () => {
    const stages = new Set(generateJobs().map((j) => j.stage));
    expect([...stages].sort()).toEqual([...STAGES].sort());
  });
  it('never has a job awaiting approval without an unanswered proof', () => {
    for (const j of generateJobs().filter((j) => j.stage === 'awaiting-approval')) {
      expect(j.proofs.at(-1)?.outcome).toBeUndefined();
    }
  });
  it('approves the final proof of every job that reached production', () => {
    const later = STAGES.slice(STAGES.indexOf('printing'));
    for (const j of generateJobs().filter((j) => later.includes(j.stage))) {
      expect(j.proofs.at(-1)?.outcome).toBe('approved');
    }
  });
});

describe('due dates', () => {
  it('labels late, today, tomorrow and later', () => {
    expect(dueLabel({ ...base, dueOn: addDays(today, -2) }, today)).toBe('2 days late');
    expect(dueLabel({ ...base, dueOn: addDays(today, -1) }, today)).toBe('1 day late');
    expect(dueLabel(base, today)).toBe('Due today');
    expect(dueLabel({ ...base, dueOn: addDays(today, 1) }, today)).toBe('Tomorrow');
    expect(dueLabel({ ...base, dueOn: addDays(today, 6) }, today)).toBe('In 6 days');
  });
  it('never calls a finished job late', () => {
    const done = { ...base, stage: 'ready' as const, dueOn: addDays(today, -4) };
    expect(isLate(done, today)).toBe(false);
    expect(dueState(done, today)).toBe('done');
  });
});

describe('saved views', () => {
  const jobs = generateJobs();
  it('"All jobs" is every job', () => {
    expect(applyView(jobs, 'all', today)).toHaveLength(jobs.length);
  });
  it('every narrower view is a subset of "All jobs"', () => {
    for (const v of VIEWS) expect(applyView(jobs, v.id, today).length).toBeLessThanOrEqual(jobs.length);
  });
  it('"Late" only holds open jobs past due', () => {
    for (const j of applyView(jobs, 'late', today)) expect(isLate(j, today)).toBe(true);
  });
});

describe('sizes', () => {
  it('uses feet only when both sides are whole feet', () => {
    expect(formatSize({ ...base, size: { w: 72, h: 36 } })).toBe('6′ × 3′');
    expect(formatSize({ ...base, size: { w: 96, h: 90 } })).toBe('96″ × 90″');
  });
});
