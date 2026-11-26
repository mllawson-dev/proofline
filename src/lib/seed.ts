// Deterministic seed data for the demo shop. The same seed always produces the same jobs, so screenshots,
// tests and the case study all describe one consistent "snapshot" of the shop.
// Every name here is fictional.

import { daysBetween } from './jobs';
import type { Customer, Job, ProductType, ProofRound, Staff, Stage } from './types';

/** The date the demo shop is frozen at. Due-date logic is relative to this, not to the real clock. */
export const SNAPSHOT_DATE = '2026-11-17';

export const customers: Customer[] = [
  { id: 'c01', name: 'Desert Bloom Dental', contact: 'Rosa Ibarra' },
  { id: 'c02', name: 'Cactus Creek HOA', contact: 'Dale Whitfield' },
  { id: 'c03', name: 'Gilbert Grit CrossFit', contact: 'Tasha Moore' },
  { id: 'c04', name: 'Saguaro Plumbing Co.', contact: 'Ernie Vasquez' },
  { id: 'c05', name: 'Mesa Arts Collective', contact: 'June Park' },
  { id: 'c06', name: 'Heritage Court Realty', contact: 'Priya Nandakumar' },
  { id: 'c07', name: 'Copper Kettle Café', contact: 'Ben Oduya' },
  { id: 'c08', name: 'Valley Youth Soccer', contact: 'Coach Lena Ruiz' },
  { id: 'c09', name: 'Sunbelt Auto Glass', contact: 'Marcus Hill' },
  { id: 'c10', name: 'East Valley Food Bank', contact: 'Hannah Stokes' }
];

export const staff: Staff[] = [
  { id: 's01', name: 'Alex Romero', role: 'counter' },
  { id: 's02', name: 'Jordan Kim', role: 'designer' },
  { id: 's03', name: 'Sam Patel', role: 'designer' },
  { id: 's04', name: 'Chris Delgado', role: 'production' },
  { id: 's05', name: 'Morgan Lee', role: 'manager' }
];

const PRODUCTS: { type: ProductType; material: string; sizes: [number, number][]; qty: [number, number] }[] = [
  { type: 'Banner', material: '13 oz scrim vinyl, hemmed + grommets', sizes: [[72, 36], [96, 48], [120, 36]], qty: [1, 4] },
  { type: 'Yard sign', material: '4 mm coroplast, H-stakes', sizes: [[24, 18]], qty: [10, 120] },
  { type: 'Vehicle graphics', material: 'Cast wrap vinyl + overlaminate', sizes: [[180, 60], [96, 30]], qty: [1, 3] },
  { type: 'Window decal', material: 'Perforated window film', sizes: [[36, 24], [48, 72]], qty: [1, 6] },
  { type: 'A-frame', material: 'Signicade frame, 2 printed inserts', sizes: [[24, 36]], qty: [1, 2] },
  { type: 'Wall graphic', material: 'Textured wall vinyl', sizes: [[144, 96], [96, 72]], qty: [1, 1] },
  { type: 'Dimensional letters', material: '1/2 in PVC, painted', sizes: [[96, 18]], qty: [1, 1] },
  { type: 'Trade show display', material: '8 ft fabric pop-up + case wrap', sizes: [[96, 90]], qty: [1, 1] }
];

const TITLES: Record<ProductType, string[]> = {
  Banner: ['Grand opening banner', 'Season sign-up banner', 'Fence banner set', 'Event step-and-repeat'],
  'Yard sign': ['Open house yard signs', 'Election-free zone signs', 'Directional event signs'],
  'Vehicle graphics': ['Service van partial wrap', 'Truck door logos'],
  'Window decal': ['Storefront hours decal', 'Holiday window graphics'],
  'A-frame': ['Sidewalk menu A-frame', 'Daily specials A-frame'],
  'Wall graphic': ['Lobby feature wall', 'Gym motivation wall'],
  'Dimensional letters': ['Reception logo letters'],
  'Trade show display': ['Expo booth backdrop']
};

/** Small seeded PRNG (mulberry32): deterministic and dependency-free. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// How many jobs sit in each stage in the snapshot: a believable shop week, heavier in the middle.
const STAGE_MIX: [Stage, number][] = [
  ['intake', 4],
  ['proofing', 6],
  ['awaiting-approval', 7],
  ['printing', 6],
  ['finishing', 4],
  ['quality-check', 3],
  ['ready', 5],
  ['picked-up', 5]
];

export function generateJobs(seed = 1042): Job[] {
  const rand = rng(seed);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
  const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
  const designers = staff.filter((s) => s.role === 'designer');

  const jobs: Job[] = [];
  let number = 1001;
  for (const [stage, count] of STAGE_MIX) {
    for (let i = 0; i < count; i++) {
      const product = pick(PRODUCTS);
      const [w, h] = pick(product.sizes);
      const createdOn = addDays(SNAPSHOT_DATE, -between(1, 16));
      const rush = rand() < 0.18;
      // Most jobs are due 1–3 weeks after intake; rush jobs within 3 days. A few run late on purpose.
      let dueOn = addDays(createdOn, rush ? between(1, 3) : between(7, 21));
      const finished = stage === 'ready' || stage === 'picked-up';
      if (!finished && rand() < 0.15) dueOn = addDays(SNAPSHOT_DATE, -between(1, 3));

      const stageIndex = STAGE_MIX.findIndex(([s]) => s === stage);
      const proofs: ProofRound[] = [];
      if (stageIndex >= 1 && stage !== 'proofing') {
        // Past proofing: one or more rounds, the last one approved unless the customer still has it.
        const rounds = between(1, 3);
        // Spread the rounds between intake and the snapshot so no proof is dated in the future.
        const span = daysBetween(createdOn, SNAPSHOT_DATE);
        for (let v = 1; v <= rounds; v++) {
          const last = v === rounds;
          proofs.push({
            version: v,
            sentOn: addDays(createdOn, Math.floor((span * v) / (rounds + 1))),
            outcome: last ? (stage === 'awaiting-approval' ? undefined : 'approved') : 'changes-requested',
            comments: last && stage === 'awaiting-approval' ? 0 : between(1, 6)
          });
        }
      } else if (stage === 'proofing' && rand() < 0.5) {
        const sentOn = addDays(createdOn, Math.floor(daysBetween(createdOn, SNAPSHOT_DATE) / 2));
        proofs.push({ version: 1, sentOn, outcome: 'changes-requested', comments: between(1, 5) });
      }

      jobs.push({
        id: `PL-${number++}`,
        title: pick(TITLES[product.type]),
        customerId: pick(customers).id,
        product: product.type,
        size: { w, h },
        quantity: between(product.qty[0], product.qty[1]),
        material: product.material,
        stage,
        rush,
        createdOn,
        dueOn,
        designerId: stage === 'intake' ? undefined : pick(designers).id,
        proofs
      });
    }
  }
  return jobs;
}
