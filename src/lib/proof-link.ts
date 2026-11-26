// Signed, expiring proof links. Customers never get an account: the link itself proves they may answer
// one specific proof round of one job, until it expires. Server-only (uses node:crypto and the secret).

import { createHmac, timingSafeEqual } from 'node:crypto';

export type ProofLinkClaims = { jobId: string; version: number; expiresAt: number };

export type VerifyResult = { ok: true; claims: ProofLinkClaims } | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' };

const DAY = 86_400_000;

export function signProofLink(claims: ProofLinkClaims, secret: string): string {
  assertSecret(secret);
  const payload = base64url(JSON.stringify([claims.jobId, claims.version, claims.expiresAt]));
  return `${payload}.${sign(payload, secret)}`;
}

/** Links last 14 days by default: long enough for a slow customer, short enough that old links die. */
export function newProofLink(jobId: string, version: number, secret: string, now = Date.now(), days = 14): string {
  return signProofLink({ jobId, version, expiresAt: now + days * DAY }, secret);
}

export function verifyProofLink(token: string, secret: string, now = Date.now()): VerifyResult {
  assertSecret(secret);
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return { ok: false, reason: 'malformed' };

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'bad-signature' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!Array.isArray(parsed) || parsed.length !== 3) return { ok: false, reason: 'malformed' };
  const [jobId, version, expiresAt] = parsed as unknown[];
  if (typeof jobId !== 'string' || typeof version !== 'number' || typeof expiresAt !== 'number') return { ok: false, reason: 'malformed' };
  if (now > expiresAt) return { ok: false, reason: 'expired' };
  return { ok: true, claims: { jobId, version, expiresAt } };
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function base64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function assertSecret(secret: string) {
  if (!secret || secret.length < 32) throw new Error('PROOF_LINK_SECRET must be at least 32 characters.');
}
