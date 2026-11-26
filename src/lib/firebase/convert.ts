// Firestore documents ↔ the plain domain types in types.ts. The job number is the document id, so it is
// not stored twice. Validation is strict on purpose: a malformed document is reported, never half-rendered.

import { STAGES, type Customer, type Job, type ProductType, type ProofRound, type Role, type Staff } from '../types';

export type JobDoc = Omit<Job, 'id'>;

const ROLES: Role[] = ['counter', 'designer', 'production', 'manager'];

export function toJobDoc(job: Job): JobDoc {
  const { id: _id, ...rest } = job;
  // Firestore rejects `undefined`; leave optional fields out instead.
  const doc: JobDoc = { ...rest, proofs: rest.proofs.map(stripUndefined) };
  if (doc.designerId === undefined) delete doc.designerId;
  return doc;
}

export function fromJobDoc(id: string, data: unknown): Job {
  if (!isRecord(data)) throw new Error(`Job ${id}: not an object`);
  const d = data;
  const stage = d.stage;
  if (typeof stage !== 'string' || !(STAGES as readonly string[]).includes(stage)) throw new Error(`Job ${id}: unknown stage`);
  const size = d.size;
  if (!isRecord(size) || typeof size.w !== 'number' || typeof size.h !== 'number') throw new Error(`Job ${id}: bad size`);
  if (!Array.isArray(d.proofs)) throw new Error(`Job ${id}: proofs must be a list`);
  for (const key of ['title', 'customerId', 'product', 'material', 'createdOn', 'dueOn'] as const) {
    if (typeof d[key] !== 'string') throw new Error(`Job ${id}: ${key} must be text`);
  }
  if (typeof d.quantity !== 'number' || typeof d.rush !== 'boolean') throw new Error(`Job ${id}: bad quantity or rush flag`);

  const job: Job = {
    id,
    title: d.title as string,
    customerId: d.customerId as string,
    product: d.product as ProductType,
    size: { w: size.w, h: size.h },
    quantity: d.quantity,
    material: d.material as string,
    stage: stage as Job['stage'],
    rush: d.rush,
    createdOn: d.createdOn as string,
    dueOn: d.dueOn as string,
    proofs: d.proofs.map((p, i) => proofFromDoc(id, i, p))
  };
  if (typeof d.designerId === 'string') job.designerId = d.designerId;
  return job;
}

function proofFromDoc(id: string, index: number, p: unknown): ProofRound {
  if (!isRecord(p) || typeof p.version !== 'number' || typeof p.sentOn !== 'string' || typeof p.comments !== 'number') {
    throw new Error(`Job ${id}: proof ${index + 1} is malformed`);
  }
  const round: ProofRound = { version: p.version, sentOn: p.sentOn, comments: p.comments };
  if (p.outcome === 'approved' || p.outcome === 'changes-requested') round.outcome = p.outcome;
  if (typeof p.note === 'string') round.note = p.note;
  return round;
}

export function fromCustomerDoc(id: string, data: unknown): Customer {
  if (!isRecord(data) || typeof data.name !== 'string' || typeof data.contact !== 'string') throw new Error(`Customer ${id}: malformed`);
  return { id, name: data.name, contact: data.contact };
}

export function fromStaffDoc(id: string, data: unknown): Staff {
  if (!isRecord(data) || typeof data.name !== 'string' || !ROLES.includes(data.role as Role)) throw new Error(`Staff ${id}: malformed`);
  return { id, name: data.name, role: data.role as Role };
}

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
