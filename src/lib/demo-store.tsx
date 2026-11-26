'use client';

// The visitor's copy of the demo shop. The server renders the seeded snapshot; moves and proof answers
// are kept here, in this browser tab only, so the board, proofs, jobs table and dashboard all agree.
// The live store (firebase/live-store.tsx) implements the same interface (docs/decisions/0002-demo-state.md).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { checkRoleMove } from './roles';
import { ShopContext, type ShopChange, type ShopStore } from './shop';
import type { Customer, Job, Role, Stage, Staff } from './types';
import { answerProof, moveJob, type ProofAnswer } from './workflow';

const STORAGE_KEY = 'proofline-demo-v2';

/** One sample person per role, so "view as" shows a real name. */
function personFor(role: Role, staff: Staff[]): Staff {
  return staff.find((s) => s.role === role) ?? { id: `demo-${role}`, name: 'Demo user', role };
}

export function DemoStoreProvider({
  seed,
  customers,
  staff,
  today,
  children
}: {
  seed: Job[];
  customers: Customer[];
  staff: Staff[];
  today: string;
  children: React.ReactNode;
}) {
  const [jobs, setJobs] = useState<Job[]>(seed);
  // Visitors start as the manager, who sees the whole shop; the rail lets them switch.
  const [role, setRole] = useState<Role>('manager');
  const [lastChange, setLastChange] = useState<ShopChange>();
  const loaded = useRef(false);

  // Restore this tab's edits after hydration, so the first render always matches the server.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { today: string; jobs: Job[]; role?: Role };
        if (parsed.today === today && Array.isArray(parsed.jobs)) setJobs(parsed.jobs);
        if (parsed.role) setRole(parsed.role);
      }
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The demo still works without it.
    }
    loaded.current = true;
  }, [today]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ today, jobs, role }));
    } catch {
      /* see above */
    }
  }, [jobs, role, today]);

  // Compare contents, not identity: restoring from storage makes a new array even when nothing changed.
  const seedKey = useMemo(() => JSON.stringify(seed), [seed]);
  const edited = useMemo(() => JSON.stringify(jobs) !== seedKey, [jobs, seedKey]);

  const byId = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const customerNames = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const staffNames = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);
  const customerName = useCallback((id: string) => customerNames.get(id) ?? 'Unknown customer', [customerNames]);
  const staffName = useCallback((id?: string) => (id ? staffNames.get(id) : undefined), [staffNames]);

  const replace = useCallback(
    (id: string, update: (job: Job) => Job, label: (before: Job) => string) => {
      const before = byId.get(id);
      if (!before) throw new Error(`No job ${id}`);
      const after = update(before); // throws with a readable reason when the rules say no
      setJobs((all) => all.map((j) => (j.id === id ? after : j)));
      setLastChange({ before, label: label(before) });
      return after;
    },
    [byId]
  );

  const value: ShopStore = {
    mode: 'demo',
    jobs,
    customers,
    staff,
    today,
    me: personFor(role, staff),
    role,
    switchRole: (next) => {
      setRole(next);
      setLastChange(undefined);
    },
    customerName,
    staffName,
    getJob: (id) => byId.get(id),
    move: async (id: string, to: Stage) =>
      replace(
        id,
        (j) => {
          const check = checkRoleMove(role, j, to);
          if (!check.ok) throw new Error(check.reason);
          return moveJob(j, to, today);
        },
        (b) => `Moved ${b.id}`
      ),
    // The customer answers from their own link; no staff role is involved.
    answer: async (id: string, a: ProofAnswer) =>
      replace(id, (j) => answerProof(j, a), (b) => (a.outcome === 'approved' ? `Approved proof for ${b.id}` : `Requested changes on ${b.id}`)),
    lastChange,
    undo: async () => {
      if (!lastChange) return;
      const { before } = lastChange;
      setJobs((all) => all.map((j) => (j.id === before.id ? before : j)));
      setLastChange(undefined);
    },
    edited,
    reset: () => {
      setJobs(seed);
      setLastChange(undefined);
    }
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
