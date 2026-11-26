'use client';

// The one interface every screen uses. Two providers implement it: the demo store (demo-store.tsx,
// sample data kept in the visitor's tab) and the live store (firebase/live-store.tsx, Firestore).

import { createContext, useContext } from 'react';
import type { Customer, Job, Role, Stage, Staff } from './types';
import type { ProofAnswer } from './workflow';

export type ShopChange = { label: string; before: Job };

export type ShopStore = {
  mode: 'demo' | 'live';
  jobs: Job[];
  customers: Customer[];
  staff: Staff[];
  today: string;
  /** The person using the app and the role their screens are built for. */
  me: Staff;
  role: Role;
  /** Demo only: try the app as another role. Live roles come from the signed-in account. */
  switchRole?: (role: Role) => void;
  customerName: (id: string) => string;
  staffName: (id?: string) => string | undefined;
  getJob: (id: string) => Job | undefined;
  /** Throws with a readable reason when the shop or role rules say no. */
  move: (id: string, to: Stage) => Promise<Job>;
  answer: (id: string, answer: ProofAnswer) => Promise<Job>;
  lastChange?: ShopChange;
  undo: () => Promise<void>;
  edited: boolean;
  reset?: () => void;
};

export const ShopContext = createContext<ShopStore | null>(null);

export function useShop(): ShopStore {
  const store = useContext(ShopContext);
  if (!store) throw new Error('useShop must be used inside a shop provider');
  return store;
}
