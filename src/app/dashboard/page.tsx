import type { Metadata } from 'next';
import { ManagerDashboard } from '@/components/ManagerDashboard';
import { RoleGate } from '@/components/RoleGate';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <RoleGate screen="dashboard">
      <ManagerDashboard />
    </RoleGate>
  );
}
