import type { Metadata } from 'next';
import { ProductionBoard } from '@/components/ProductionBoard';
import { RoleGate } from '@/components/RoleGate';

export const metadata: Metadata = { title: 'Production board' };

export default function BoardPage() {
  return (
    <RoleGate screen="board">
      <ProductionBoard />
    </RoleGate>
  );
}
