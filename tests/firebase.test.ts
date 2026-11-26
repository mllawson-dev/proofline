import { describe, expect, it } from 'vitest';
import { readFirebaseConfig } from '@/lib/firebase/env';
import { fromCustomerDoc, fromJobDoc, fromStaffDoc, toJobDoc } from '@/lib/firebase/convert';
import { newProofLink, signProofLink, verifyProofLink } from '@/lib/proof-link';
import { checkCanAnswer, checkProofAccess } from '@/lib/proof-access';
import { customers, generateJobs, SNAPSHOT_DATE, staff } from '@/lib/seed';
import { answerProof } from '@/lib/workflow';

const SECRET = 'test-secret-that-is-long-enough-1234567890';

describe('live mode switch', () => {
  const full = {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'k',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'x.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'x',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:2:web:3'
  };
  it('turns on only when every setting is present', () => {
    expect(readFirebaseConfig(full)).toEqual({ apiKey: 'k', authDomain: 'x.firebaseapp.com', projectId: 'x', appId: '1:2:web:3' });
    expect(readFirebaseConfig({ ...full, NEXT_PUBLIC_FIREBASE_APP_ID: '  ' })).toBeUndefined();
    expect(readFirebaseConfig({})).toBeUndefined();
  });
});

describe('Firestore documents', () => {
  it('round-trips every seeded job exactly', () => {
    for (const job of generateJobs()) expect(fromJobDoc(job.id, toJobDoc(job))).toEqual(job);
  });
  it('never writes undefined fields (Firestore rejects them)', () => {
    for (const job of generateJobs()) {
      const json = JSON.stringify(toJobDoc(job), (_k, v) => (v === undefined ? '__undefined__' : v));
      expect(json).not.toContain('__undefined__');
      expect(toJobDoc(job)).not.toHaveProperty('id');
    }
  });
  it('rejects a malformed job instead of rendering half of it', () => {
    const doc = toJobDoc(generateJobs()[0]!);
    expect(() => fromJobDoc('PL-1', { ...doc, stage: 'lost' })).toThrow(/stage/);
    expect(() => fromJobDoc('PL-1', { ...doc, proofs: 'none' })).toThrow(/proofs/);
    expect(() => fromJobDoc('PL-1', { ...doc, size: { w: '6ft' } })).toThrow(/size/);
    expect(() => fromJobDoc('PL-1', null)).toThrow();
  });
  it('reads customers and staff, and rejects unknown roles', () => {
    const c = customers[0]!;
    expect(fromCustomerDoc(c.id, { name: c.name, contact: c.contact })).toEqual(c);
    const s = staff[0]!;
    expect(fromStaffDoc(s.id, { name: s.name, role: s.role })).toEqual(s);
    expect(() => fromStaffDoc('x', { name: 'X', role: 'owner' })).toThrow();
  });
});

describe('proof links', () => {
  const now = Date.parse('2026-11-17T12:00:00Z');
  it('verifies a link it signed', () => {
    const token = newProofLink('PL-1011', 2, SECRET, now);
    const r = verifyProofLink(token, SECRET, now + 1000);
    expect(r).toEqual({ ok: true, claims: { jobId: 'PL-1011', version: 2, expiresAt: now + 14 * 86_400_000 } });
  });
  it('rejects a link after it expires', () => {
    const token = newProofLink('PL-1011', 2, SECRET, now, 1);
    expect(verifyProofLink(token, SECRET, now + 2 * 86_400_000)).toEqual({ ok: false, reason: 'expired' });
  });
  it('rejects a link signed with another secret', () => {
    const token = newProofLink('PL-1011', 2, `${SECRET}-other`, now);
    expect(verifyProofLink(token, SECRET, now)).toEqual({ ok: false, reason: 'bad-signature' });
  });
  it('rejects a link whose job or round was edited', () => {
    const token = signProofLink({ jobId: 'PL-1011', version: 2, expiresAt: now + 1000 }, SECRET);
    const [, sig] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify(['PL-1012', 2, now + 1000])).toString('base64url')}.${sig}`;
    expect(verifyProofLink(forged, SECRET, now)).toEqual({ ok: false, reason: 'bad-signature' });
  });
  it('rejects junk', () => {
    expect(verifyProofLink('nonsense', SECRET).ok).toBe(false);
    expect(verifyProofLink('a.b.c', SECRET).ok).toBe(false);
  });
  it('refuses a short secret', () => {
    expect(() => newProofLink('PL-1', 1, 'short')).toThrow(/32 characters/);
  });
});


describe('what a proof link unlocks', () => {
  const waiting = generateJobs().find((j) => j.stage === 'awaiting-approval')!;
  const version = waiting.proofs.at(-1)!.version;
  const now = Date.parse(`${SNAPSHOT_DATE}T12:00:00Z`);
  const good = verifyProofLink(newProofLink(waiting.id, version, SECRET, now), SECRET, now);

  it('opens the round the link was signed for', () => {
    expect(checkProofAccess(good, waiting.id, waiting)).toEqual({ ok: true, job: waiting });
    expect(checkCanAnswer(waiting).ok).toBe(true);
  });
  it('refuses the link on another job', () => {
    expect(checkProofAccess(good, 'PL-9999', waiting)).toMatchObject({ ok: false, status: 403 });
  });
  it('sends an old link to the newest proof', () => {
    const newer = { ...waiting, proofs: [...waiting.proofs, { version: version + 1, sentOn: SNAPSHOT_DATE, comments: 0 }] };
    const r = checkProofAccess(good, waiting.id, newer);
    expect(r).toMatchObject({ ok: false, status: 410 });
    if (!r.ok) expect(r.message).toMatch(`v${version + 1}`);
  });
  it('shows an answered proof but will not take a second answer', () => {
    const answered = answerProof(waiting, { outcome: 'approved' });
    expect(checkProofAccess(good, waiting.id, answered).ok).toBe(true);
    expect(checkCanAnswer(answered)).toMatchObject({ ok: false, status: 409 });
  });
  it('explains an expired link with a next step', () => {
    const expired = verifyProofLink(newProofLink(waiting.id, version, SECRET, now, 1), SECRET, now + 3 * 86_400_000);
    const r = checkProofAccess(expired, waiting.id, waiting);
    expect(r).toMatchObject({ ok: false, status: 410 });
    if (!r.ok) expect(r.message).toMatch(/call the shop/i);
  });
  it('reports a missing job as not found', () => {
    expect(checkProofAccess(good, waiting.id, undefined)).toMatchObject({ ok: false, status: 404 });
  });
});
