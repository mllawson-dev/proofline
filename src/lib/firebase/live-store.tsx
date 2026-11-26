'use client';

// The live shop: staff sign in with Firebase Auth, their role comes from a custom claim set by
// scripts/set-role.ts, and jobs stream from Firestore. Every move runs in a transaction that re-checks the
// shop and role rules against the latest copy of the job, and firestore.rules checks them again on the server.

import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { checkRoleMove } from '../roles';
import { ShopContext, type ShopChange, type ShopStore } from '../shop';
import type { Customer, Job, Role, Stage, Staff } from '../types';
import { moveJob } from '../workflow';
import { firebase } from './client';
import { fromCustomerDoc, fromJobDoc, fromStaffDoc, isRole, toJobDoc } from './convert';
import { SignIn } from '@/components/SignIn';

type Session = { user: User; role: Role } | null | undefined; // undefined = still checking

/** Today's date where the shop is, as YYYY-MM-DD. Live mode uses the real calendar. */
function localToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function LiveStoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(undefined);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string>();
  const [lastChange, setLastChange] = useState<ShopChange>();
  const [today, setToday] = useState(localToday);

  useEffect(() => {
    const { auth } = firebase();
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return setSession(null);
      const token = await user.getIdTokenResult(true);
      const role = token.claims.role;
      if (!isRole(role)) {
        setError('This account has no shop role yet. Ask the shop manager to run scripts/set-role.ts for it.');
        return setSession(null);
      }
      setError(undefined);
      setSession({ user, role });
    });
  }, []);

  // Keep "today" right if the app stays open past midnight.
  useEffect(() => {
    const t = setInterval(() => setToday(localToday()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!session) return;
    const { db } = firebase();
    const fail = (what: string) => (e: Error) => setError(`Could not load ${what}: ${e.message}`);
    const unsubs = [
      onSnapshot(collection(db, 'jobs'), (snap) => setJobs(snap.docs.map((d) => fromJobDoc(d.id, d.data()))), fail('jobs')),
      onSnapshot(collection(db, 'customers'), (snap) => setCustomers(snap.docs.map((d) => fromCustomerDoc(d.id, d.data()))), fail('customers')),
      onSnapshot(collection(db, 'staff'), (snap) => setStaff(snap.docs.map((d) => fromStaffDoc(d.id, d.data()))), fail('staff'))
    ];
    return () => unsubs.forEach((u) => u());
  }, [session]);

  const byId = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const customerNames = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const staffNames = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);
  const customerName = useCallback((id: string) => customerNames.get(id) ?? 'Unknown customer', [customerNames]);
  const staffName = useCallback((id?: string) => (id ? staffNames.get(id) : undefined), [staffNames]);

  if (session === undefined) return <p style={{ padding: '2rem' }} role="status">Checking your sign-in…</p>;
  if (session === null) return <SignIn error={error} />;

  const role = session.role;
  const me: Staff = staff.find((s) => s.id === session.user.uid) ?? { id: session.user.uid, name: session.user.email ?? 'Signed in', role };

  const value: ShopStore = {
    mode: 'live',
    jobs,
    customers,
    staff,
    today,
    me,
    role,
    customerName,
    staffName,
    getJob: (id) => byId.get(id),
    move: async (id: string, to: Stage) => {
      const { db } = firebase();
      const ref = doc(db, 'jobs', id);
      const { before, after } = await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error(`${id} no longer exists.`);
        const current = fromJobDoc(id, snap.data());
        const check = checkRoleMove(role, current, to);
        if (!check.ok) throw new Error(check.reason);
        const next = moveJob(current, to, today);
        tx.set(ref, toJobDoc(next));
        return { before: current, after: next };
      });
      // Offer Undo only when this role may make the reverse move under the same rules.
      const reversible = after.proofs.length === before.proofs.length && checkRoleMove(role, after, before.stage).ok;
      setLastChange(reversible ? { before, label: `Moved ${id}` } : undefined);
      return after;
    },
    answer: async () => {
      throw new Error('Customers answer proofs from their own link.');
    },
    lastChange,
    undo: async () => {
      if (!lastChange) return;
      const { id, stage } = lastChange.before;
      setLastChange(undefined);
      await value.move(id, stage); // the same checked path as any move
      setLastChange(undefined);
    },
    edited: false
  };

  return (
    <ShopContext.Provider value={value}>
      {error && (
        <p role="alert" style={{ margin: 0, padding: '0.75rem 1rem', background: 'var(--late-tint)', color: 'var(--ink)' }}>
          {error}
        </p>
      )}
      {children}
    </ShopContext.Provider>
  );
}
