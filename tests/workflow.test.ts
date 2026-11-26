import { describe, expect, it } from 'vitest';
import { addDays, generateJobs, SNAPSHOT_DATE } from '@/lib/seed';
import type { Job } from '@/lib/types';
import { answerProof, checkMove, moveJob, nextStage, openProof, previousStage } from '@/lib/workflow';

const today = SNAPSHOT_DATE;
const base: Job = {
  id: 'PL-1', title: 'Test', customerId: 'c01', product: 'Banner', size: { w: 72, h: 36 }, quantity: 1,
  material: 'vinyl', stage: 'printing', rush: false, createdOn: addDays(today, -5), dueOn: today, proofs: [
    { version: 1, sentOn: addDays(today, -3), outcome: 'approved', comments: 2 }
  ]
};
const awaiting: Job = { ...base, stage: 'awaiting-approval', proofs: [{ version: 1, sentOn: addDays(today, -2), comments: 0 }] };

describe('board moves', () => {
  it('moves one stage at a time in either direction', () => {
    expect(checkMove(base, 'finishing').ok).toBe(true);
    expect(checkMove({ ...base, stage: 'finishing' }, 'printing').ok).toBe(true);
    expect(checkMove(base, 'ready').ok).toBe(false);
  });
  it('refuses a move to the stage the job is already in', () => {
    expect(checkMove(base, 'printing').ok).toBe(false);
  });
  it('leaves jobs awaiting approval to the customer', () => {
    const forward = checkMove(awaiting, 'printing');
    const back = checkMove(awaiting, 'proofing');
    expect(forward.ok).toBe(false);
    expect(back.ok).toBe(false);
    if (!forward.ok) expect(forward.reason).toMatch(/customer/i);
  });
  it('does not send an approved job back to the customer from printing', () => {
    expect(checkMove(base, 'awaiting-approval').ok).toBe(false);
  });
  it('starts a new, unanswered proof round when a proof is sent', () => {
    const proofing: Job = { ...base, stage: 'proofing', proofs: [{ version: 1, sentOn: addDays(today, -4), outcome: 'changes-requested', comments: 3 }] };
    const sent = moveJob(proofing, 'awaiting-approval', today);
    expect(sent.stage).toBe('awaiting-approval');
    expect(sent.proofs).toHaveLength(2);
    expect(sent.proofs[1]).toEqual({ version: 2, sentOn: today, comments: 0 });
    expect(openProof(sent)).toBe(sent.proofs[1]);
  });
  it('throws a readable reason for a refused move and leaves the job unchanged', () => {
    expect(() => moveJob(awaiting, 'printing', today)).toThrow(/customer/i);
    expect(awaiting.stage).toBe('awaiting-approval');
  });
  it('knows the neighbouring stages', () => {
    expect(previousStage('intake')).toBeUndefined();
    expect(nextStage('picked-up')).toBeUndefined();
    expect(nextStage('proofing')).toBe('awaiting-approval');
  });
});

describe('proof answers', () => {
  it('approval marks the round approved and sends the job to printing', () => {
    const done = answerProof(awaiting, { outcome: 'approved' });
    expect(done.stage).toBe('printing');
    expect(done.proofs.at(-1)?.outcome).toBe('approved');
    expect(openProof(done)).toBeUndefined();
  });
  it('a change request goes back to proofing with the note attached', () => {
    const back = answerProof(awaiting, { outcome: 'changes-requested', note: '  Make the phone number bigger. ' });
    expect(back.stage).toBe('proofing');
    expect(back.proofs.at(-1)).toMatchObject({ outcome: 'changes-requested', note: 'Make the phone number bigger.', comments: 1 });
  });
  it('a change request needs a note', () => {
    expect(() => answerProof(awaiting, { outcome: 'changes-requested', note: '   ' })).toThrow(/what to change/i);
  });
  it('only answers a proof that is waiting', () => {
    expect(() => answerProof(base, { outcome: 'approved' })).toThrow();
  });
  it('every seeded job awaiting approval has a proof to answer', () => {
    for (const j of generateJobs().filter((j) => j.stage === 'awaiting-approval')) expect(openProof(j)).toBeDefined();
  });
});

describe('seed dates', () => {
  it('never dates a proof after the snapshot day', () => {
    for (const j of generateJobs()) for (const p of j.proofs) expect(p.sentOn <= SNAPSHOT_DATE).toBe(true);
  });
  it('never sends a proof before the job came in', () => {
    for (const j of generateJobs()) for (const p of j.proofs) expect(p.sentOn >= j.createdOn).toBe(true);
  });
});
