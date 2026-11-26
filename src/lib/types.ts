// Domain model for Proofline. Plain data, no framework types, so the same shapes work for the
// in-memory demo store today and Firestore documents later (see docs/decisions/0001-data-layer.md).

/** Where a job is in the shop. Order matters: it is the left-to-right order of the production board. */
export const STAGES = [
  'intake',
  'proofing',
  'awaiting-approval',
  'printing',
  'finishing',
  'quality-check',
  'ready',
  'picked-up'
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  intake: 'Intake',
  proofing: 'Proofing',
  'awaiting-approval': 'Awaiting approval',
  printing: 'Printing',
  finishing: 'Finishing',
  'quality-check': 'Quality check',
  ready: 'Ready',
  'picked-up': 'Picked up'
};

/** Which team owns the next move. Drives the stage color (see tokens.css) and the role views. */
export type Owner = 'counter' | 'design' | 'customer' | 'production' | 'done';

export const STAGE_OWNER: Record<Stage, Owner> = {
  intake: 'counter',
  proofing: 'design',
  'awaiting-approval': 'customer',
  printing: 'production',
  finishing: 'production',
  'quality-check': 'production',
  ready: 'done',
  'picked-up': 'done'
};

export type Role = 'counter' | 'designer' | 'production' | 'manager';

export type ProductType =
  | 'Banner'
  | 'Yard sign'
  | 'Vehicle graphics'
  | 'Window decal'
  | 'A-frame'
  | 'Wall graphic'
  | 'Dimensional letters'
  | 'Trade show display';

export type Customer = {
  id: string;
  name: string;
  contact: string;
};

export type Staff = {
  id: string;
  name: string;
  role: Role;
};

export type ProofRound = {
  version: number;
  sentOn: string; // ISO date
  /** Unset while the customer has not answered yet. */
  outcome?: 'approved' | 'changes-requested';
  comments: number;
  /** What the customer asked to change, when they asked for changes from the proof screen. */
  note?: string;
};

export type Job = {
  id: string; // e.g. "PL-1042"
  title: string;
  customerId: string;
  product: ProductType;
  /** Finished size in inches, width × height. */
  size: { w: number; h: number };
  quantity: number;
  material: string;
  stage: Stage;
  rush: boolean;
  createdOn: string; // ISO date
  dueOn: string; // ISO date
  designerId?: string;
  proofs: ProofRound[];
};
