// Hand-written sample data for the demo shop. The same jobs every time, so screenshots, tests and the
// case study all describe one consistent "snapshot" of the shop.
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

const MATERIAL: Record<ProductType, string> = {
  Banner: '13 oz scrim vinyl, hemmed + grommets',
  'Yard sign': '4 mm coroplast, H-stakes',
  'Vehicle graphics': 'Cast wrap vinyl + overlaminate',
  'Window decal': 'Perforated window film',
  'A-frame': 'Signicade frame, 2 printed inserts',
  'Wall graphic': 'Textured wall vinyl',
  'Dimensional letters': '1/2 in PVC, painted',
  'Trade show display': '8 ft fabric pop-up + case wrap'
};

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The shop's week, written by hand so every job fits the customer who ordered it.
 * Columns: stage, title, customer, product, [width, height] in inches, quantity, rush,
 * days since intake, due date relative to the snapshot (negative = late), designer, proof rounds.
 * Proof rounds: for jobs past proofing, how many rounds went out (the last is approved, or still
 * with the customer in Awaiting approval). For jobs in proofing, 1 means an earlier round came back
 * with changes and the designer is revising.
 */
type JobSpec = [Stage, string, string, ProductType, [number, number], number, boolean, number, number, 's02' | 's03' | null, number];

const JOBS: JobSpec[] = [
  // Intake: just taken at the counter, no designer yet.
  ['intake', 'Fall festival banner', 'c02', 'Banner', [120, 36], 2, true, 7, -6, null, 0],
  ['intake', 'Office logo letters', 'c06', 'Dimensional letters', [96, 18], 1, false, 9, -5, null, 0],
  ['intake', 'Art fair booth backdrop', 'c05', 'Trade show display', [96, 90], 1, false, 5, -2, null, 0],
  ['intake', 'Drop-off directional signs', 'c10', 'Yard sign', [24, 18], 24, false, 1, 6, null, 0],
  // Proofing: a designer is on it.
  ['proofing', 'Patient welcome wall', 'c01', 'Wall graphic', [144, 96], 1, false, 6, -1, 's02', 0],
  ['proofing', 'Volunteer fair booth', 'c10', 'Trade show display', [96, 90], 1, false, 8, 3, 's03', 1],
  ['proofing', 'Weekend brunch A-frame', 'c07', 'A-frame', [24, 36], 1, false, 4, 4, 's02', 1],
  ['proofing', 'Job site yard signs', 'c04', 'Yard sign', [24, 18], 40, false, 3, 6, 's03', 0],
  ['proofing', 'Gallery night banner', 'c05', 'Banner', [96, 48], 1, false, 2, 8, 's02', 0],
  ['proofing', 'Reception logo letters', 'c01', 'Dimensional letters', [96, 18], 1, false, 10, 8, 's02', 1],
  // Awaiting approval: proof is with the customer.
  ['awaiting-approval', 'Open house yard signs', 'c06', 'Yard sign', [24, 18], 30, false, 14, -6, 's02', 2],
  ['awaiting-approval', 'Showroom window graphics', 'c09', 'Window decal', [48, 72], 2, false, 12, 8, 's03', 1],
  ['awaiting-approval', 'Community yard sale signs', 'c02', 'Yard sign', [24, 18], 45, true, 9, -3, 's02', 3],
  ['awaiting-approval', 'Sponsor fence banners', 'c08', 'Banner', [96, 48], 6, false, 11, 6, 's03', 3],
  ['awaiting-approval', 'Rig wall graphic', 'c03', 'Wall graphic', [144, 96], 1, false, 13, 12, 's03', 3],
  ['awaiting-approval', 'Grand reopening banner', 'c03', 'Banner', [120, 36], 1, false, 8, 0, 's02', 3],
  ['awaiting-approval', 'Storefront hours decal', 'c07', 'Window decal', [36, 24], 1, false, 6, 0, 's03', 1],
  // Printing.
  ['printing', 'Season sign-up banner', 'c08', 'Banner', [72, 36], 2, false, 15, -2, 's03', 2],
  ['printing', 'Member photo wall', 'c03', 'Wall graphic', [96, 72], 1, false, 12, 13, 's02', 1],
  ['printing', 'Exhibit window graphics', 'c05', 'Window decal', [48, 72], 3, false, 14, 15, 's03', 2],
  ['printing', 'Agent car door decals', 'c06', 'Vehicle graphics', [96, 30], 4, false, 10, 4, 's02', 2],
  ['printing', 'Curbside service A-frame', 'c09', 'A-frame', [24, 36], 2, false, 9, 10, 's03', 2],
  ['printing', 'Holiday drive banner', 'c10', 'Banner', [120, 36], 2, false, 11, 17, 's02', 2],
  // Finishing.
  ['finishing', 'Field parking signs', 'c08', 'Yard sign', [24, 18], 20, true, 12, -8, 's02', 2],
  ['finishing', 'Mobile service van wrap', 'c09', 'Vehicle graphics', [180, 60], 1, true, 16, -2, 's03', 1],
  ['finishing', 'Menu board wall graphic', 'c07', 'Wall graphic', [96, 72], 1, false, 13, 14, 's02', 2],
  ['finishing', 'Service van partial wrap', 'c04', 'Vehicle graphics', [180, 60], 2, false, 14, 15, 's03', 3],
  // Quality check.
  ['quality-check', 'Donor recognition wall', 'c10', 'Wall graphic', [144, 96], 1, false, 15, 2, 's03', 1],
  ['quality-check', 'Coach rally banner', 'c08', 'Banner', [96, 48], 1, false, 11, 13, 's02', 2],
  ['quality-check', 'Truck door logos', 'c04', 'Vehicle graphics', [96, 30], 2, false, 13, 14, 's03', 1],
  // Ready for pickup.
  ['ready', 'Lobby feature wall', 'c01', 'Wall graphic', [144, 96], 1, true, 16, -11, 's02', 1],
  ['ready', 'Pool rules signs', 'c02', 'Yard sign', [24, 18], 8, false, 15, 5, 's03', 1],
  ['ready', 'Daily specials A-frame', 'c07', 'A-frame', [24, 36], 1, false, 10, 8, 's02', 1],
  ['ready', 'Food drive yard signs', 'c10', 'Yard sign', [24, 18], 60, false, 12, 8, 's02', 2],
  ['ready', 'Class schedule decal', 'c03', 'Window decal', [36, 24], 1, false, 14, 14, 's03', 2],
  // Picked up this week.
  ['picked-up', 'Showroom banner', 'c09', 'Banner', [96, 48], 1, false, 16, 4, 's03', 3],
  ['picked-up', 'Sold rider signs', 'c06', 'Yard sign', [24, 18], 40, false, 14, 8, 's02', 3],
  ['picked-up', 'Holiday window graphics', 'c01', 'Window decal', [36, 24], 4, false, 13, 12, 's02', 2],
  ['picked-up', 'Studio hours decal', 'c05', 'Window decal', [36, 24], 1, false, 15, 13, 's03', 1],
  ['picked-up', 'Plumbing expo backdrop', 'c04', 'Trade show display', [96, 90], 1, false, 16, 19, 's03', 1]
];

/** The demo shop's jobs. Fully deterministic: the same list every time, numbered PL-1001 upward. */
export function generateJobs(): Job[] {
  return JOBS.map(([stage, title, customerId, product, [w, h], quantity, rush, ago, due, designerId, rounds], i) => {
    const createdOn = addDays(SNAPSHOT_DATE, -ago);
    const span = daysBetween(createdOn, SNAPSHOT_DATE);
    const proofs: ProofRound[] = [];
    if (stage === 'proofing') {
      if (rounds > 0) proofs.push({ version: 1, sentOn: addDays(createdOn, Math.floor(span / 2)), outcome: 'changes-requested', comments: 2 + (i % 3) });
    } else if (stage !== 'intake') {
      // Spread the rounds between intake and the snapshot so no proof is dated in the future.
      for (let v = 1; v <= rounds; v++) {
        const last = v === rounds;
        proofs.push({
          version: v,
          sentOn: addDays(createdOn, Math.floor((span * v) / (rounds + 1))),
          outcome: last ? (stage === 'awaiting-approval' ? undefined : 'approved') : 'changes-requested',
          comments: last && stage === 'awaiting-approval' ? 0 : 1 + ((i + v) % 5)
        });
      }
    }
    return {
      id: `PL-${1001 + i}`,
      title,
      customerId,
      product,
      size: { w, h },
      quantity,
      material: MATERIAL[product],
      stage,
      rush,
      createdOn,
      dueOn: addDays(SNAPSHOT_DATE, due),
      designerId: designerId ?? undefined,
      proofs
    };
  });
}
