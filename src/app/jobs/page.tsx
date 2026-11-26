import type { Metadata } from 'next';
import { JobsTable } from '@/components/JobsTable';
import { RoleGate } from '@/components/RoleGate';

export const metadata: Metadata = { title: 'Jobs' };

export default function JobsPage() {
  return (
    <RoleGate screen="jobs">
      <JobsTable />
    </RoleGate>
  );
}
