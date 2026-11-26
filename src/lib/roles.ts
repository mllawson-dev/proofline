// Who may do what. One table for the UI and the Firestore rules (firestore.rules mirrors these
// lists; tests/roles.test.ts keeps them honest). Pure data and functions, no framework code.

import { isOpen } from './jobs';
import { STAGES, type Job, type Role, type Stage, type Staff } from './types';
import { checkMove, type MoveCheck } from './workflow';

export const ROLE_LABELS: Record<Role, string> = {
  counter: 'Front counter',
  designer: 'Designer',
  production: 'Production',
  manager: 'Shop manager'
};

/** The stages each role works in. Their board opens on these columns. */
export const ROLE_STAGES: Record<Role, readonly Stage[]> = {
  counter: ['intake', 'ready', 'picked-up'],
  designer: ['proofing', 'awaiting-approval'],
  production: ['printing', 'finishing', 'quality-check', 'ready'],
  manager: STAGES
};

/**
 * Board moves a role may make, as [from, to] pairs. Anything not listed is someone else's call.
 * - Counter takes orders in, hands them to design, and checks them out at pickup.
 * - Designers send proofs and can hand a job back to the counter when the brief is incomplete.
 * - Production moves work along the floor and marks it ready.
 * - The manager can make any move the shop rules allow.
 */
const ROLE_MOVES: Record<Exclude<Role, 'manager'>, readonly [Stage, Stage][]> = {
  counter: [
    ['intake', 'proofing'],
    ['ready', 'picked-up'],
    ['picked-up', 'ready']
  ],
  designer: [
    ['proofing', 'awaiting-approval'],
    ['proofing', 'intake']
  ],
  production: [
    ['printing', 'finishing'],
    ['finishing', 'printing'],
    ['finishing', 'quality-check'],
    ['quality-check', 'finishing'],
    ['quality-check', 'ready'],
    ['ready', 'quality-check']
  ]
};

export function roleMoves(role: Exclude<Role, 'manager'>): readonly [Stage, Stage][] {
  return ROLE_MOVES[role];
}

/** The shop rule first (workflow.ts), then the role rule. Reasons are written for the person at the screen. */
export function checkRoleMove(role: Role, job: Job, to: Stage): MoveCheck {
  const shop = checkMove(job, to);
  if (!shop.ok) return shop;
  if (role === 'manager') return shop;
  const allowed = ROLE_MOVES[role].some(([from, target]) => from === job.stage && target === to);
  return allowed ? { ok: true } : { ok: false, reason: `That move belongs to ${ownerOfMove(job.stage, to)}. Ask them, or the shop manager.` };
}

function ownerOfMove(from: Stage, to: Stage): string {
  for (const role of ['counter', 'designer', 'production'] as const) {
    if (ROLE_MOVES[role].some(([f, t]) => f === from && t === to)) return ROLE_LABELS[role].toLowerCase();
  }
  return 'the shop manager';
}

export type Screen = 'jobs' | 'board' | 'proofs' | 'dashboard';

export const ROLE_SCREENS: Record<Role, readonly Screen[]> = {
  counter: ['jobs', 'board', 'proofs'],
  designer: ['jobs', 'board', 'proofs'],
  production: ['jobs', 'board'],
  manager: ['jobs', 'board', 'proofs', 'dashboard']
};

export function canSee(role: Role, screen: Screen): boolean {
  return ROLE_SCREENS[role].includes(screen);
}

/** The first saved view for each role: the work that is theirs right now. The manager starts on all open jobs. */
export function myWork(role: Role, me: Staff): { label: string; description: string; test: (job: Job) => boolean } | undefined {
  switch (role) {
    case 'designer':
      return {
        label: 'My jobs',
        description: `Open jobs assigned to ${me.name}`,
        test: (j) => j.designerId === me.id && isOpen(j)
      };
    case 'counter':
      return {
        label: 'At the counter',
        description: 'New orders to hand to design, and finished work to check out',
        test: (j) => j.stage === 'intake' || j.stage === 'ready'
      };
    case 'production':
      return {
        label: 'On the floor',
        description: 'Printing, finishing and quality check',
        test: (j) => j.stage === 'printing' || j.stage === 'finishing' || j.stage === 'quality-check'
      };
    default:
      return undefined;
  }
}
