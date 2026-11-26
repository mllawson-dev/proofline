import { adminDb, proofLinkSecret, serverConfigured } from '@/lib/firebase/admin';
import { fromCustomerDoc, fromJobDoc, fromStaffDoc, toJobDoc } from '@/lib/firebase/convert';
import { liveMode } from '@/lib/firebase/env';
import { checkCanAnswer, checkProofAccess } from '@/lib/proof-access';
import { verifyProofLink } from '@/lib/proof-link';
import { answerProof, type ProofAnswer } from '@/lib/workflow';

// The customer's side of a proof link. Customers never sign in; the signed token is their only credential,
// and it only ever unlocks one round of one job. Firestore rules deny customers everything, so all customer
// reads and writes come through here with the Admin SDK.

const noStore = { 'cache-control': 'no-store' };

function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: noStore });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!liveMode) return fail(404, 'Not available in the demo.');
  if (!serverConfigured()) return fail(503, 'Proof links aren’t set up on this server yet.');
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('t') ?? '';
  const db = adminDb();
  const snap = await db.collection('jobs').doc(id).get();
  const job = snap.exists ? fromJobDoc(id, snap.data()) : undefined;
  const access = checkProofAccess(verifyProofLink(token, proofLinkSecret()), id, job);
  if (!access.ok) return fail(access.status, access.message);

  const [customer, designer] = await Promise.all([
    db.collection('customers').doc(access.job.customerId).get(),
    access.job.designerId ? db.collection('staff').doc(access.job.designerId).get() : undefined
  ]);
  return Response.json(
    {
      job: access.job,
      customer: fromCustomerDoc(customer.id, customer.data()),
      // First name only: the customer needs to know who to talk to, not the staff directory.
      designerName: designer?.exists ? fromStaffDoc(designer.id, designer.data()).name.split(' ')[0] : undefined
    },
    { headers: noStore }
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!liveMode) return fail(404, 'Not available in the demo.');
  if (!serverConfigured()) return fail(503, 'Proof links aren’t set up on this server yet.');
  const { id } = await params;
  let body: { token?: unknown; answer?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, 'Something went wrong sending your answer. Please try again.');
  }
  const answer = parseAnswer(body.answer);
  if (!answer) return fail(400, 'Choose approve, or tell us what to change.');
  const link = verifyProofLink(typeof body.token === 'string' ? body.token : '', proofLinkSecret());

  const db = adminDb();
  const ref = db.collection('jobs').doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const job = snap.exists ? fromJobDoc(id, snap.data()) : undefined;
      const access = checkProofAccess(link, id, job);
      if (!access.ok) throw new HttpError(access.status, access.message);
      const can = checkCanAnswer(access.job);
      if (!can.ok) throw new HttpError(can.status, can.message);
      tx.set(ref, toJobDoc(answerProof(access.job, answer)));
    });
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.message);
    if (e instanceof Error && /what to change/.test(e.message)) return fail(400, e.message);
    throw e;
  }
  return Response.json({ ok: true }, { headers: noStore });
}

function parseAnswer(raw: unknown): ProofAnswer | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const a = raw as { outcome?: unknown; note?: unknown };
  if (a.outcome === 'approved') return { outcome: 'approved' };
  if (a.outcome === 'changes-requested' && typeof a.note === 'string' && a.note.trim() && a.note.length <= 2000) {
    return { outcome: 'changes-requested', note: a.note };
  }
  return undefined;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
