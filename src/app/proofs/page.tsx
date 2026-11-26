import type { Metadata } from 'next';
import { ProofQueue } from '@/components/ProofQueue';
import { RoleGate } from '@/components/RoleGate';

export const metadata: Metadata = { title: 'Proofs' };

export default function ProofsPage() {
  return (
    <RoleGate screen="proofs">
      <ProofQueue />
    </RoleGate>
  );
}
