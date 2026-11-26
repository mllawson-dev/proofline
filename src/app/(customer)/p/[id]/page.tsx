import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemoCustomerProof, LiveCustomerProof } from '@/components/CustomerProofSources';
import { repository } from '@/lib/data/memory';
import { liveMode } from '@/lib/firebase/env';

// Demo: every job number in the sample shop gets a proof page, so any proof the visitor sends from the board opens.
// Live: pages render on request; the signed link (?t=) is checked by the API route.
export async function generateStaticParams() {
  if (liveMode) return [];
  const jobs = await repository.listJobs();
  return jobs.map((job) => ({ id: job.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  // A customer link should not be indexed.
  return { title: `Proof for ${id}`, robots: { index: false, follow: false } };
}

export default async function CustomerProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The signed token (?t=) is read in the browser, so this page stays static and the token never reaches a server log.
  if (liveMode) return <LiveCustomerProof id={id} />;
  if (!(await repository.getJob(id))) notFound();
  return <DemoCustomerProof id={id} />;
}
