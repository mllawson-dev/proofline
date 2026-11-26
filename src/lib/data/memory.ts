import { customers, generateJobs, SNAPSHOT_DATE, staff } from '../seed';
import type { Job, Stage } from '../types';
import type { JobRepository } from './repository';

export function createMemoryRepository(): JobRepository {
  const jobs = new Map(generateJobs().map((j) => [j.id, j] as const));
  return {
    async listJobs() {
      return [...jobs.values()];
    },
    async getJob(id) {
      return jobs.get(id);
    },
    async listCustomers() {
      return customers;
    },
    async listStaff() {
      return staff;
    },
    async moveJob(id: string, stage: Stage) {
      const job = jobs.get(id);
      if (!job) throw new Error(`No job ${id}`);
      const next: Job = { ...job, stage };
      jobs.set(id, next);
      return next;
    },
    today: () => SNAPSHOT_DATE
  };
}

/** One shared demo store for server components. */
export const repository = createMemoryRepository();
