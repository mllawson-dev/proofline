// Firestore security rules, checked in the emulator against the same role table the UI uses.
// Run with `npm run test:rules` (needs Java 21+ for the emulator).

import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { toJobDoc } from '@/lib/firebase/convert';
import { roleMoves } from '@/lib/roles';
import { generateJobs } from '@/lib/seed';
import { STAGES, type Job, type Role, type Stage } from '@/lib/types';
import { checkMove, moveJob } from '@/lib/workflow';

let env: RulesTestEnvironment;
const today = '2026-11-17';
const base = generateJobs()[0]!;

function jobAt(stage: Stage): Job {
  const proofs =
    stage === 'awaiting-approval'
      ? [{ version: 1, sentOn: today, comments: 0 }]
      : stage === 'proofing' || stage === 'intake'
        ? [{ version: 1, sentOn: today, outcome: 'changes-requested' as const, comments: 2 }]
        : [{ version: 1, sentOn: today, outcome: 'approved' as const, comments: 0 }];
  return { ...base, id: 'PL-1', stage, proofs, designerId: 's02' };
}

const as = (role: Role) => env.authenticatedContext(`uid-${role}`, { role }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-proofline',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

async function seed(job: Job) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'jobs', job.id), toJobDoc(job));
  });
}

/** Every one-step move the shop rules allow. */
const shopMoves: [Stage, Stage][] = STAGES.flatMap((from) =>
  STAGES.filter((to) => checkMove(jobAt(from), to).ok).map((to) => [from, to] as [Stage, Stage])
);

describe('reading', () => {
  it('lets staff read jobs and keeps everyone else out', async () => {
    await seed(jobAt('printing'));
    await assertSucceeds(getDoc(doc(as('production'), 'jobs', 'PL-1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'jobs', 'PL-1')));
    await assertFails(getDoc(doc(env.authenticatedContext('stranger', {}).firestore(), 'jobs', 'PL-1')));
  });
});

describe('moves match src/lib/roles.ts', () => {
  for (const role of ['counter', 'designer', 'production'] as const) {
    const mine = roleMoves(role);
    for (const [from, to] of shopMoves) {
      const allowed = mine.some(([f, t]) => f === from && t === to);
      it(`${role} ${allowed ? 'may' : 'may not'} move ${from} → ${to}`, async () => {
        const job = jobAt(from);
        await seed(job);
        const write = setDoc(doc(as(role), 'jobs', job.id), toJobDoc(moveJob(job, to, today)));
        await (allowed ? assertSucceeds(write) : assertFails(write));
      });
    }
  }
  for (const [from, to] of shopMoves) {
    it(`manager may move ${from} → ${to}`, async () => {
      const job = jobAt(from);
      await seed(job);
      await assertSucceeds(setDoc(doc(as('manager'), 'jobs', job.id), toJobDoc(moveJob(job, to, today))));
    });
  }
});

describe('guarding the details', () => {
  it('stops production from editing anything but the stage', async () => {
    const job = jobAt('printing');
    await seed(job);
    await assertFails(updateDoc(doc(as('production'), 'jobs', job.id), { stage: 'finishing', rush: true }));
  });
  it('stops a designer from rewriting earlier proof rounds while sending', async () => {
    const job = jobAt('proofing');
    await seed(job);
    const sent = moveJob(job, 'awaiting-approval', today);
    const tampered = { ...sent, proofs: [{ ...sent.proofs[0]!, outcome: 'approved' as const }, sent.proofs[1]!] };
    await assertFails(setDoc(doc(as('designer'), 'jobs', job.id), toJobDoc(tampered)));
  });
  it('stops a designer from marking their own proof approved', async () => {
    const job = jobAt('proofing');
    await seed(job);
    const sent = moveJob(job, 'awaiting-approval', today);
    const selfApproved = { ...sent, proofs: [...sent.proofs.slice(0, -1), { ...sent.proofs.at(-1)!, outcome: 'approved' as const }] };
    await assertFails(setDoc(doc(as('designer'), 'jobs', job.id), toJobDoc(selfApproved)));
  });
  it('lets only the counter and manager open new jobs', async () => {
    const job = { ...jobAt('intake'), id: 'PL-NEW' };
    await assertFails(setDoc(doc(as('designer'), 'jobs', job.id), toJobDoc(job)));
    await assertSucceeds(setDoc(doc(as('counter'), 'jobs', job.id), toJobDoc(job)));
  });
  it('lets only the manager change staff records', async () => {
    await assertFails(setDoc(doc(as('counter'), 'staff', 'x'), { name: 'X', role: 'manager' }));
    await assertSucceeds(setDoc(doc(as('manager'), 'staff', 'x'), { name: 'X', role: 'counter' }));
  });
});
