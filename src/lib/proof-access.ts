// What a signed proof link allows, decided without any I/O so it can be tested on its own.
// The API routes load the job, call these, and write the result in a transaction.

import type { ProofLinkClaims, VerifyResult } from './proof-link';
import type { Job } from './types';
import { openProof } from './workflow';

export type Access = { ok: true; job: Job } | { ok: false; status: 400 | 403 | 404 | 410; message: string };

/** Customer-facing messages: plain, no internal codes, and always a next step. */
export function checkProofAccess(link: VerifyResult, id: string, job: Job | undefined): Access {
  if (!link.ok) {
    return link.reason === 'expired'
      ? { ok: false, status: 410, message: 'This proof link has expired. Call the shop and we’ll send a fresh one.' }
      : { ok: false, status: 403, message: 'This proof link isn’t valid. Use the full link from your text or email.' };
  }
  const claims: ProofLinkClaims = link.claims;
  if (claims.jobId !== id) return { ok: false, status: 403, message: 'This proof link isn’t valid for this job.' };
  if (!job) return { ok: false, status: 404, message: 'We couldn’t find this job. Call the shop and we’ll sort it out.' };
  const latest = job.proofs.at(-1);
  if (latest && latest.version > claims.version) {
    return { ok: false, status: 410, message: `There’s a newer proof (v${latest.version}). Use the most recent link we sent you.` };
  }
  // A link can still show a proof that was already answered; answering again is refused separately.
  if (!latest || latest.version !== claims.version) return { ok: false, status: 404, message: 'We couldn’t find this proof.' };
  return { ok: true, job };
}

/** Answering needs the round to still be open. */
export function checkCanAnswer(job: Job): { ok: true } | { ok: false; status: 409; message: string } {
  return openProof(job) ? { ok: true } : { ok: false, status: 409, message: 'This proof has already been answered.' };
}
