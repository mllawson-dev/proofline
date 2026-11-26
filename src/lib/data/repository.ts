// The data layer the UI talks to. Today it is backed by the seeded in-memory store (memory.ts);
// a Firestore implementation will satisfy the same interface (docs/decisions/0001-data-layer.md).

import type { Customer, Job, Staff, Stage } from '../types';

export interface JobRepository {
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  listCustomers(): Promise<Customer[]>;
  listStaff(): Promise<Staff[]>;
  moveJob(id: string, stage: Stage): Promise<Job>;
  /** The date the data describes: the frozen snapshot in the demo, the real date in production. */
  today(): string;
}
