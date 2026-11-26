import { adminAuth, adminDb, proofLinkSecret, serverConfigured } from '@/lib/firebase/admin';
import { fromJobDoc, isRole } from '@/lib/firebase/convert';
import { liveMode } from '@/lib/firebase/env';
import { newProofLink } from '@/lib/proof-link';
import { openProof } from '@/lib/workflow';

// Staff ask for a customer's proof link here. The caller must send a fresh Firebase ID token for an account
// whose role may send proofs; the link is signed for the job's current, unanswered round only.

const MAY_SEND = new Set(['counter', 'designer', 'manager']);

export async function POST(request: Request) {
  if (!liveMode) return Response.json({ error: 'Not available in the demo.' }, { status: 404 });
  if (!serverConfigured()) return Response.json({ error: 'Set FIREBASE_SERVICE_ACCOUNT and PROOF_LINK_SECRET on the server first.' }, { status: 503 });
  const idToken = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  let role: unknown;
  try {
    role = (await adminAuth().verifyIdToken(idToken, true)).role;
  } catch {
    return Response.json({ error: 'Sign in again to get a proof link.' }, { status: 401 });
  }
  if (!isRole(role) || !MAY_SEND.has(role)) return Response.json({ error: 'Your role can’t send proof links.' }, { status: 403 });

  const { jobId } = ((await request.json().catch(() => ({}))) ?? {}) as { jobId?: unknown };
  if (typeof jobId !== 'string') return Response.json({ error: 'Which job?' }, { status: 400 });
  const snap = await adminDb().collection('jobs').doc(jobId).get();
  if (!snap.exists) return Response.json({ error: `${jobId} not found.` }, { status: 404 });
  const round = openProof(fromJobDoc(jobId, snap.data()));
  if (!round) return Response.json({ error: `${jobId} has no proof waiting on the customer.` }, { status: 409 });

  const token = newProofLink(jobId, round.version, proofLinkSecret());
  const url = new URL(`/p/${encodeURIComponent(jobId)}?t=${token}`, request.url);
  return Response.json({ url: url.toString(), version: round.version }, { headers: { 'cache-control': 'no-store' } });
}
