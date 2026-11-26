# 0001 — Put the data behind a repository interface, starting in memory

- **Status:** Accepted
- **Date:** 2026-11-17

## Context
Proofline will store jobs in Firestore with per-role security rules. Building screens against Firestore from day one would mean every UI change waits on a Firebase project, auth, rules and seed scripts, and the demo would depend on a live backend.

## Decision
All screens read and write through `JobRepository` (`src/lib/data/repository.ts`). Version 0.1 uses an in-memory implementation seeded with deterministic data frozen at a snapshot date (`src/lib/seed.ts`). A Firestore implementation will satisfy the same interface later.

## Consequences
- Screens, tests and screenshots are stable: the same seed always gives the same shop.
- Due-date logic uses `repository.today()`, never the system clock, so "late" means the same thing in the demo, the tests and the case study.
- The switch to Firestore is one new file plus a provider change, and it will come with its own decision record covering auth, rules and optimistic updates.
- Risk: an in-memory store can hide latency and error states. Every screen must still design its loading and error states before the Firestore switch.
