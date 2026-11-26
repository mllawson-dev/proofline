# Proofline

A job tracker for a sign and print shop: order intake, proof approval, production and quality check, with each person seeing only their part. A portfolio concept by [Michael L. Lawson](https://www.mll-creativeeng.com). The shop, customers and jobs are fictional.

**[Open the live demo](https://proofline-phi-one.vercel.app/)** · [Case study](https://www.mll-creativeeng.com/case-studies/proofline/)

The public demo runs on sample data in your browser, with no login. Switch roles from the rail to see the shop as the front counter, a designer, production or the manager. The same code runs on Firebase with real accounts ([going live](docs/going-live.md)).

## What's in it — v1.0
- **Jobs table**: saved views with counts, search, stage filter, sortable columns, late-job marking, stacked cards on phones. Each role opens on its own work ("My jobs" for a designer, "On the floor" for production).
- **Production board**: a column per stage, cards sorted by urgency, moves by button (keyboard and screen reader) or drag. Shop rules and role rules are both enforced, and every move can be undone.
- **Role views**: counter, designer, production and manager each see their own stages and can only make their own moves. The dashboard is the manager's.
- **Customer proof approval** at `/p/[job]`: a phone-first layout proof drawn to scale. Approve with a confirmation check, or request changes with a required note. Live mode uses signed, expiring links, so customers never need an account.
- **Proofs queue**: every proof out with a customer, longest wait first, plus customer change notes. Live mode adds **Copy customer link**.
- **Manager dashboard**: headline figures, jobs per stage, a "needs attention" list, designer load and jobs with three or more proof rounds.
- **Firebase live mode**: Auth with role claims, Firestore with transactional moves, security rules mirroring the role table, and a server route for customer answers.

Not built yet: creating jobs from the counter screen, editing customers, and sending proof links by email or text.

## Run it
Requires Node 22.12 or newer.

```bash
npm install
npm run dev          # http://localhost:3000, sample-data demo
npm test             # 62 unit tests
npm run typecheck
npm run test:rules   # Firestore security rules in the emulator (needs Java 21+)
```

## How it's built
- Next.js (App Router) + TypeScript in strict mode. Staff screens share a layout with the navigation rail (`src/components/ShopLayout.tsx`); the customer proof link lives in the `(customer)` route group with no rail.
- Rules live in plain, tested functions: shop workflow (`src/lib/workflow.ts`), roles (`src/lib/roles.ts`), dashboard figures (`src/lib/dashboard.ts`) and proof-link access (`src/lib/proof-access.ts`). The UI only renders their decisions.
- One store interface (`src/lib/shop.tsx`) with two providers: the demo store in the visitor's tab, and the live Firestore store.
- TanStack Table for the jobs table. CSS Modules on top of the custom-property tokens in `src/styles/tokens.css`.
- Archivo (condensed display), IBM Plex Sans and Plex Mono, self-hosted via Fontsource.
- Decisions are recorded in `docs/decisions/`: the data layer (0001), demo state (0002) and Firebase (0003).

## Accessibility
Every text color pair is at least 4.5:1 (listed in `docs/art-direction.md`). Stage colors always come with words. On the board, every drag has a button equivalent, moves are announced in a polite status line, and focus stays with the card that moved, or moves to the announcement when the card leaves your view. Cards only offer moves your role can make, and say whose move it is otherwise. The customer proof form marks errors in text and with `aria-invalid`, and moves focus to the confirmation when the customer answers. The dashboard's stage chart is a real table with the counts written out, in a single ink, because the owner colors are a status system, not a chart palette. Every screen passes an axe-core WCAG 2.2 AA scan at desktop and phone sizes, with no sideways page scroll on phones.
