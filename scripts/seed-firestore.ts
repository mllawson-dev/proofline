// Loads the same sample shop the demo uses into Firestore, so live mode starts with real-looking work.
// Usage: npm run seed:firestore            (refuses to overwrite existing jobs)
//        npm run seed:firestore -- --force (replaces jobs with the same numbers)
import { getFirestore } from 'firebase-admin/firestore';
import { toJobDoc } from '../src/lib/firebase/convert';
import { customers, generateJobs } from '../src/lib/seed';
import { initAdmin } from './admin-init';

const db = getFirestore(initAdmin());
const force = process.argv.includes('--force');

const existing = await db.collection('jobs').limit(1).get();
if (!existing.empty && !force) {
  console.error('Firestore already has jobs. Re-run with -- --force to replace jobs with the same numbers.');
  process.exit(1);
}

const batch = db.batch();
for (const c of customers) batch.set(db.collection('customers').doc(c.id), { name: c.name, contact: c.contact });
const jobs = generateJobs();
for (const j of jobs) batch.set(db.collection('jobs').doc(j.id), toJobDoc(j));
await batch.commit();
console.log(`Loaded ${customers.length} customers and ${jobs.length} jobs.`);
